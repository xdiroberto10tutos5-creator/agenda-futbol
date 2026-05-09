"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Plus,
  Users,
  DollarSign,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Pencil,
} from "lucide-react";

const COSTO_POR_CLASE = 5;
const SEMANAS_POR_CICLO = 4;

function getClassesPerCycle(student: any) {
  return Math.max((student.schedule?.length || 1) * SEMANAS_POR_CICLO, 1);
}

const diasSemana = [
  { id: 1, name: "Lunes" },
  { id: 2, name: "Martes" },
  { id: 3, name: "Miércoles" },
  { id: 4, name: "Jueves" },
  { id: 5, name: "Viernes" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

function getTodayMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseDateParts(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createLocalDate(dateString: string) {
  const { year, month, day } = parseDateParts(dateString);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function addMonths(yearMonth: string, monthsToAdd: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1, 12, 0, 0);
  return formatDateLocal(date).slice(0, 7);
}

function getMonthEndDate(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return formatDateLocal(new Date(year, month, 0, 12, 0, 0));
}

function getDatesBetween(startDate: string, endDate: string, weekday: number) {
  const date = createLocalDate(startDate);
  const end = createLocalDate(endDate);
  const dates = [];

  while (date <= end) {
    if (date.getDay() === weekday) {
      dates.push(formatDateLocal(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function addDays(dateString: string, days: number) {
  const date = createLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return formatDateLocal(date);
}

function getCurrentWeekRange() {
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  const day = localToday.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(localToday);
  monday.setDate(localToday.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDateLocal(monday),
    end: formatDateLocal(sunday),
  };
}

function getWeekDates(startDate: string) {
  return diasSemana.map((day, index) => {
    const date = createLocalDate(startDate);
    date.setDate(date.getDate() + index);
    return {
      ...day,
      date: formatDateLocal(date),
    };
  });
}

function getDayName(dayId: number) {
  return diasSemana.find((day) => day.id === dayId)?.name || "Día";
}

export default function AgendaFutbolMVP() {
  const [selectedMonth, setSelectedMonth] = useState(getTodayMonth());
  const [selectedCycleNumber, setSelectedCycleNumber] = useState(1);
  const [students, setStudents] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentForm, setStudentForm] = useState<any>({
    name: "",
    parent: "",
    phone: "",
    startDate: "",
    schedule: [],
  });

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchClassRecords();
    fetchPayments();
  }, []);

  async function fetchClassRecords() {
    const { data, error } = await supabase.from("class_records").select("*");

    if (error) {
      console.error(error);
      return;
    }

    setExceptions(
      (data || []).map((record) => ({
        id: record.id,
        sessionKey: record.session_key,
        studentId: record.student_id,
        originalDate: record.original_date,
        status: record.status,
        newDate: record.class_date !== record.original_date ? record.class_date : undefined,
        newTime: record.time ? String(record.time).slice(0, 5) : undefined,
        newPlace: record.place || undefined,
      }))
    );
  }

  async function fetchPayments() {
    const { data, error } = await supabase.from("payments").select("*");

    if (error) {
      console.error(error);
      return;
    }

    setPayments(
      (data || []).map((payment) => ({
        id: payment.id,
        studentId: payment.student_id,
        cycleNumber: payment.cycle_number,
        amount: Number(payment.amount),
        date: payment.payment_date,
      }))
    );
  }

  async function fetchStudents() {
    setLoading(true);

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const studentsWithSchedules = await Promise.all(
      (data || []).map(async (student) => {
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select("*")
          .eq("student_id", student.id)
          .order("weekday", { ascending: true });

        if (scheduleError) {
          console.error(scheduleError);
        }

        return {
          id: student.id,
          name: student.name,
          parent: student.parent_name || "",
          phone: student.phone || "",
          startDate: student.start_date,
          schedule: (schedules || []).map((item) => ({
            weekday: item.weekday,
            time: String(item.time).slice(0, 5),
            place: item.place || "Cancha principal",
          })),
        };
      })
    );

    setStudents(studentsWithSchedules);
    setLoading(false);
  }

  const generatedSessions = useMemo(() => {
    const currentWeekForGeneration = getCurrentWeekRange();
    const endMonth = addMonths(selectedMonth, 3);
    const endDateFromSelectedMonth = getMonthEndDate(endMonth);
    const endDateFromCurrentWeek = addDays(currentWeekForGeneration.end, 35);
    const endDate = endDateFromSelectedMonth > endDateFromCurrentWeek ? endDateFromSelectedMonth : endDateFromCurrentWeek;
    const sessions: any[] = [];

    students.forEach((student) => {
      student.schedule.forEach((scheduleItem: any) => {
        const dates = getDatesBetween(student.startDate, endDate, scheduleItem.weekday);

        dates.forEach((date) => {
          const sessionKey = `${student.id}-${date}-${scheduleItem.weekday}-${scheduleItem.time}`;
          const exception = exceptions.find((item) => item.sessionKey === sessionKey);

          sessions.push({
            id: sessionKey,
            sessionKey,
            studentId: student.id,
            studentName: student.name,
            date: exception?.newDate || date,
            originalDate: date,
            time: exception?.newTime || scheduleItem.time,
            place: exception?.newPlace || scheduleItem.place,
            status: exception?.status || "programada",
          });
        });
      });
    });

    return sessions.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [students, exceptions, selectedMonth]);

  function getSessionStatus(session: any) {
    if (session.status !== "programada") return session.status;
    const today = new Date().toISOString().slice(0, 10);
    if (session.date < today) return "asistio";
    return "programada";
  }

  const sessionsWithCycles = useMemo(() => {
    const result: any[] = [];

    students.forEach((student) => {
      const studentSessions = generatedSessions
        .filter((session) => session.studentId === student.id)
        .sort((a, b) => `${a.originalDate} ${a.time}`.localeCompare(`${b.originalDate} ${b.time}`));

      studentSessions.forEach((session, index) => {
        const sessionStatus = getSessionStatus(session);
        const shouldCharge = sessionStatus === "asistio" || sessionStatus === "no_asistio";
        const classesPerCycle = getClassesPerCycle(student);
        const cycleNumber = Math.floor(index / classesPerCycle) + 1;
        const classNumberInCycle = (index % classesPerCycle) + 1;

        result.push({
          ...session,
          cycleNumber,
          classNumberInCycle,
          shouldCharge,
        });
      });
    });

    return result.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [students, generatedSessions]);

  const visibleCycleSummaries = useMemo(() => {
    return students.map((student) => {
      const cycleSessions = sessionsWithCycles
        .filter((session) => session.studentId === student.id && session.cycleNumber === selectedCycleNumber)
        .sort((a, b) => `${a.originalDate} ${a.time}`.localeCompare(`${b.originalDate} ${b.time}`));

      const chargedSessions = cycleSessions.filter((session) => session.shouldCharge);

      const paid = payments
        .filter((payment) => payment.studentId === student.id && payment.cycleNumber === selectedCycleNumber)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      const classesPerCycle = getClassesPerCycle(student);
      const total = Math.min(chargedSessions.length, classesPerCycle) * COSTO_POR_CLASE;
      const balance = total - paid;

      return {
        ...student,
        cycleNumber: selectedCycleNumber,
        cycleStart: cycleSessions[0]?.originalDate || student.startDate,
        cycleEnd: cycleSessions[cycleSessions.length - 1]?.originalDate || "En proceso",
        classCount: chargedSessions.length,
        total,
        paid,
        balance,
        classesPerCycle,
        status: balance <= 0 && total > 0 ? "Pago" : "Debe",
      };
    });
  }, [students, sessionsWithCycles, payments, selectedCycleNumber]);

  const visibleSessions = useMemo(() => {
    return sessionsWithCycles.filter((session) => session.date.startsWith(selectedMonth));
  }, [sessionsWithCycles, selectedMonth]);

  const groupedSessions = useMemo(() => {
    const groups: any = {};

    visibleSessions.forEach((session) => {
      const key = `${session.date}-${session.time}-${session.place}`;

      if (!groups[key]) {
        groups[key] = {
          date: session.date,
          time: session.time,
          place: session.place,
          students: [],
        };
      }

      groups[key].students.push(session);
    });

    return Object.values(groups).sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [visibleSessions]);

  const currentWeek = useMemo(() => getCurrentWeekRange(), []);
  const weekDaysWithDates = useMemo(() => getWeekDates(currentWeek.start), [currentWeek.start]);

  const weeklySchedule = useMemo(() => {
    return sessionsWithCycles
      .filter((session) => {
        const originalIsThisWeek = session.originalDate >= currentWeek.start && session.originalDate <= currentWeek.end;
        const currentDateIsThisWeek = session.date >= currentWeek.start && session.date <= currentWeek.end;
        return originalIsThisWeek || currentDateIsThisWeek;
      })
      .map((session) => {
        const originalIsThisWeek = session.originalDate >= currentWeek.start && session.originalDate <= currentWeek.end;
        return {
          ...session,
          weekDisplayDate: originalIsThisWeek ? session.originalDate : session.date,
        };
      })
      .sort((a, b) => `${a.weekDisplayDate} ${a.time}`.localeCompare(`${b.weekDisplayDate} ${b.time}`));
  }, [sessionsWithCycles, currentWeek.start, currentWeek.end]);

  const weeklyGroups = useMemo(() => {
    const groups: any = {};

    weeklySchedule.forEach((session) => {
      const key = `${session.weekDisplayDate}-${session.time}-${session.place}`;

      if (!groups[key]) {
        groups[key] = {
          date: session.weekDisplayDate,
          time: session.time,
          place: session.place,
          students: [],
        };
      }

      groups[key].students.push(session);
    });

    return Object.values(groups).sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [weeklySchedule]);

  function toggleWeekday(dayId: number) {
    const exists = studentForm.schedule.some((item: any) => item.weekday === dayId);

    if (exists) {
      setStudentForm({
        ...studentForm,
        schedule: studentForm.schedule.filter((item: any) => item.weekday !== dayId),
      });
      return;
    }

    setStudentForm({
      ...studentForm,
      schedule: [...studentForm.schedule, { weekday: dayId, time: "", place: "Cancha principal" }],
    });
  }

  function updateScheduleItem(dayId: number, field: string, value: string) {
    setStudentForm({
      ...studentForm,
      schedule: studentForm.schedule.map((item: any) =>
        item.weekday === dayId ? { ...item, [field]: value } : item
      ),
    });
  }

  async function saveStudent() {
    const hasInvalidSchedule = studentForm.schedule.some((item: any) => !item.time);

    if (!studentForm.name.trim() || !studentForm.startDate || studentForm.schedule.length === 0 || hasInvalidSchedule) return;

    if (editingStudentId) {
      const { error } = await supabase
        .from("students")
        .update({
          name: studentForm.name.trim(),
          parent_name: studentForm.parent.trim(),
          phone: studentForm.phone.trim(),
          start_date: studentForm.startDate,
        })
        .eq("id", editingStudentId);

      if (error) {
        console.error(error);
        return;
      }

      await supabase.from("schedules").delete().eq("student_id", editingStudentId);
      await supabase.from("schedules").insert(
        studentForm.schedule.map((item: any) => ({
          student_id: editingStudentId,
          weekday: item.weekday,
          time: item.time,
          place: item.place || "Sin lugar",
        }))
      );

      setEditingStudentId(null);
    } else {
      const { data: studentData, error } = await supabase
        .from("students")
        .insert([
          {
            name: studentForm.name.trim(),
            parent_name: studentForm.parent.trim(),
            phone: studentForm.phone.trim(),
            start_date: studentForm.startDate,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(error);
        return;
      }

      await supabase.from("schedules").insert(
        studentForm.schedule.map((item: any) => ({
          student_id: studentData.id,
          weekday: item.weekday,
          time: item.time,
          place: item.place || "Sin lugar",
        }))
      );
    }

    setStudentForm({ name: "", parent: "", phone: "", startDate: "", schedule: [] });
    await fetchStudents();
  }

  function editStudent(student: any) {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      parent: student.parent,
      phone: student.phone,
      startDate: student.startDate,
      schedule: student.schedule.map((item: any) => ({ ...item })),
    });
  }

  function cancelEdit() {
    setEditingStudentId(null);
    setStudentForm({ name: "", parent: "", phone: "", startDate: "", schedule: [] });
  }

  async function saveClassRecord(session: any, status: string, newDate?: string, newTime?: string, newPlace?: string) {
    const record = {
      session_key: session.sessionKey,
      student_id: session.studentId,
      original_date: session.originalDate,
      class_date: newDate || session.date,
      time: newTime || session.time,
      place: newPlace || session.place,
      cycle_number: session.cycleNumber,
      class_number: session.classNumberInCycle,
      status,
    };

    const { error } = await supabase
      .from("class_records")
      .upsert(record, { onConflict: "session_key" });

    if (error) {
      console.error(error);
      return;
    }

    await fetchClassRecords();
  }

  async function setClassStatus(session: any, status: string) {
    const existingException = exceptions.find((item) => item.sessionKey === session.sessionKey);

    await saveClassRecord(
      session,
      status,
      existingException?.newDate,
      existingException?.newTime,
      existingException?.newPlace
    );
  }

  async function postponeClass(session: any) {
    const newDate = prompt("Nueva fecha en formato YYYY-MM-DD", session.date);
    if (!newDate) return;

    const newTime = prompt("Nueva hora en formato HH:MM", session.time) || session.time;
    const newPlace = prompt("Nuevo lugar", session.place) || session.place;

    await saveClassRecord(session, "pospuesta", newDate, newTime, newPlace);
  }

  async function restoreClass(session: any) {
    const { error } = await supabase
      .from("class_records")
      .delete()
      .eq("session_key", session.sessionKey);

    if (error) {
      console.error(error);
      return;
    }

    await fetchClassRecords();
  }

  async function deleteStudent(studentId: string) {
    const confirmed = confirm("¿Seguro que deseas eliminar este alumno?");
    if (!confirmed) return;

    const { error } = await supabase.from("students").delete().eq("id", studentId);

    if (error) {
      console.error(error);
      return;
    }

    setExceptions(exceptions.filter((item) => item.studentId !== studentId));
    setPayments(payments.filter((payment) => payment.studentId !== studentId));
    await fetchStudents();
  }

  async function markAsPaid(studentId: string, cycleNumber: number, amount: number) {
    if (amount <= 0) return;

    const { error } = await supabase.from("payments").insert([
      {
        student_id: studentId,
        cycle_number: cycleNumber,
        amount,
        payment_date: new Date().toISOString().slice(0, 10),
      },
    ]);

    if (error) {
      console.error(error);
      return;
    }

    await fetchPayments();
  }

  function getStatusText(status: string) {
    if (status === "pospuesta") return "Se pospuso";
    if (status === "no_asistio") return "No asistió";
    if (status === "asistio") return "Asistió";
    return "Programado";
  }

  function getStatusColor(status: string) {
    if (status === "no_asistio") return "text-red-600";
    if (status === "pospuesta") return "text-blue-600";
    if (status === "asistio") return "text-green-700";
    return "text-green-400";
  }

  function getWhatsappMessage(student: any) {
    return `Hola, buenas tardes. Le recordamos que ${student.name} está en el ciclo ${student.cycleNumber}. Periodo: ${student.cycleStart} hasta ${student.cycleEnd}. Clases cobradas: ${student.classCount}/${student.classesPerCycle}. Total: $${student.total}. Pagado: $${student.paid}. Saldo pendiente: $${student.balance}. Muchas gracias.`;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenda Fútbol Coach</h1>
            <p className="text-slate-600">Sistema de clases, ciclos, asistencias y pagos.</p>
            {loading && <p className="text-sm text-blue-600">Cargando datos...</p>}
          </div>

          <div className="w-full md:w-56">
            <Label>Mes que quieres revisar</Label>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{editingStudentId ? "Editar niño" : "Registrar niño"}</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Nombre del niño</Label>
                  <Input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Ej: Daniel" />
                </div>

                <div>
                  <Label>Acudiente</Label>
                  <Input value={studentForm.parent} onChange={(e) => setStudentForm({ ...studentForm, parent: e.target.value })} placeholder="Ej: Mamá de Daniel" />
                </div>

                <div>
                  <Label>Fecha de inicio</Label>
                  <Input type="date" value={studentForm.startDate} onChange={(e) => setStudentForm({ ...studentForm, startDate: e.target.value })} />
                </div>

                <div>
                  <Label>WhatsApp</Label>
                  <Input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} placeholder="Ej: 6XXX-XXXX" />
                </div>

                <div>
                  <Label>Días fijos de entrenamiento</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {diasSemana.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleWeekday(day.id)}
                        className={`rounded-full border px-3 py-2 text-sm ${studentForm.schedule.some((item: any) => item.weekday === day.id) ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
                      >
                        {day.name}
                      </button>
                    ))}
                  </div>
                </div>

                {studentForm.schedule.length > 0 && (
                  <div className="space-y-3 rounded-xl border bg-white p-3">
                    <p className="text-sm font-semibold">Horario por día</p>
                    {studentForm.schedule.map((item: any) => (
                      <div key={item.weekday} className="space-y-2 rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-medium">{getDayName(item.weekday)}</p>
                        <div>
                          <Label>Hora</Label>
                          <Input type="time" value={item.time} onChange={(e) => updateScheduleItem(item.weekday, "time", e.target.value)} />
                        </div>
                        <div>
                          <Label>Lugar</Label>
                          <Input value={item.place} onChange={(e) => updateScheduleItem(item.weekday, "place", e.target.value)} placeholder="Ej: Cancha principal" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={saveStudent} className="w-full gap-2">
                  {editingStudentId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingStudentId ? "Guardar cambios" : "Agregar niño"}
                </Button>

                {editingStudentId && (
                  <Button onClick={cancelEdit} variant="outline" className="w-full">Cancelar edición</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Semana actual</h2>
              </div>

              <div className="overflow-x-auto rounded-xl border bg-white">
                <div className="grid min-w-[900px] grid-cols-7 border-b bg-slate-100 text-center text-sm font-semibold">
                  {weekDaysWithDates.map((day) => (
                    <div key={day.date} className="border-r p-3 last:border-r-0">
                      <p>{day.name}</p>
                      <p className="text-xs font-normal text-slate-500">{day.date}</p>
                    </div>
                  ))}
                </div>

                <div className="grid min-w-[900px] grid-cols-7">
                  {weekDaysWithDates.map((day) => {
                    const daySessions = weeklyGroups.filter((item: any) => item.date === day.date);

                    return (
                      <div key={day.date} className="min-h-[260px] border-r p-3 last:border-r-0">
                        {daySessions.length === 0 ? (
                          <p className="text-center text-sm text-slate-400">Sin entreno</p>
                        ) : (
                          <div className="space-y-3">
                            {daySessions.map((item: any) => (
                              <div key={`${item.date}-${item.time}-${item.place}`} className="rounded-xl border bg-slate-50 p-3 shadow-sm">
                                <div>
                                  <p className="text-sm font-semibold text-slate-500">{getDayName(createLocalDate(item.date).getDay())}</p>
                                  <p className="font-semibold">{item.date} - {item.time}</p>
                                </div>
                                <p className="text-xs text-slate-500">{item.place}</p>
                                <div className="mt-2 space-y-1">
                                  {item.students.map((session: any) => {
                                    const status = getSessionStatus(session);
                                    return (
                                      <div key={session.id} className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                                        <p className="text-xs font-medium text-slate-700">{session.studentName}</p>
                                        <p className={`text-[11px] font-semibold ${getStatusColor(status)}`}>{getStatusText(status)}</p>
                                        {session.status === "pospuesta" && <p className="text-[11px] text-slate-500">Nueva fecha: {session.date}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Clases del mes seleccionado</h3>
                <p className="text-sm text-slate-600">Aquí solo salen las clases del mes que elegiste arriba.</p>

                {groupedSessions.length === 0 && <p className="text-sm text-slate-500">No hay clases en este mes.</p>}

                {groupedSessions.map((group: any) => (
                  <div key={`${group.date}-${group.time}-${group.place}`} className="rounded-xl border bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">{getDayName(createLocalDate(group.date).getDay())}</p>
                      <p className="font-semibold">{group.date} - {group.time}</p>
                    </div>
                    <p className="text-sm text-slate-600">{group.place}</p>
                    <div className="mt-3 space-y-2">
                      {group.students.map((session: any) => (
                        <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                          <div>
                            <p className="font-medium">{session.studentName}</p>
                            <p className="text-xs text-slate-500">
                              Ciclo {session.cycleNumber} - Fecha {session.classNumberInCycle}/{getClassesPerCycle(students.find((student) => student.id === session.studentId))}
                              {!session.shouldCharge && " - Pendiente, no se cobra"}
                            </p>
                            <p className={`text-xs font-semibold ${getStatusColor(getSessionStatus(session))}`}>Estado: {getStatusText(getSessionStatus(session))}</p>
                            {session.status === "pospuesta" && <p className="text-xs text-slate-500">Original: {session.originalDate}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setClassStatus(session, "asistio")}><CheckCircle className="mr-1 h-4 w-4" /> Asistió</Button>
                            <Button size="sm" variant="outline" onClick={() => postponeClass(session)}><Clock className="mr-1 h-4 w-4" /> Posponer</Button>
                            <Button size="sm" variant="outline" onClick={() => setClassStatus(session, "no_asistio")}><XCircle className="mr-1 h-4 w-4" /> No asistió</Button>
                            {session.status !== "programada" && <Button size="sm" variant="outline" onClick={() => restoreClass(session)}><RotateCcw className="mr-1 h-4 w-4" /> Restaurar</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Resumen de mensualidad por ciclo</h2>
                </div>
                <p className="text-sm text-slate-600">Cada ciclo dura 4 semanas. Si entrena 1 día por semana son 4 clases = $20; si entrena 2 días por semana son 8 clases = $40.</p>
              </div>

              <div className="w-full md:w-44">
                <Label>Ver ciclo</Label>
                <Input type="number" min="1" value={selectedCycleNumber} onChange={(e) => setSelectedCycleNumber(Number(e.target.value) || 1)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {visibleCycleSummaries.map((student) => (
                <div key={student.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{student.name}</p>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => editStudent(student)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteStudent(student.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">Ciclo: {student.cycleNumber}</p>
                      <p className="text-sm text-slate-600">Periodo: {student.cycleStart} hasta {student.cycleEnd}</p>
                      <p className="text-sm text-slate-600">Clases cobradas: {student.classCount}/{student.classesPerCycle}</p>
                      <p className="text-sm text-slate-600">Total: ${student.total}</p>
                      <p className="text-sm text-slate-600">Pagado: ${student.paid}</p>
                      <p className={`text-sm font-semibold ${student.balance > 0 ? "text-red-600" : "text-green-600"}`}>Estado: {student.status} {student.balance > 0 ? `$${student.balance}` : ""}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {student.balance > 0 && <Button size="sm" onClick={() => markAsPaid(student.id, student.cycleNumber, student.balance)}><CheckCircle className="mr-1 h-4 w-4" /> Pagado</Button>}
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(getWhatsappMessage(student))}>Copiar WhatsApp</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
