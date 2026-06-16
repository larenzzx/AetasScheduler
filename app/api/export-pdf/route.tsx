import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { parseISO, format, addDays } from 'date-fns';
import { formatWeekRange } from '@/lib/utils';
import { Team, DayOfWeek, Employee, ShiftType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DAY_LABELS = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Helper to determine optimal text color based on background brightness
function getPdfContrastStyle(hexColor: string) {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return { color: '#000000', fontFamily: 'Helvetica-Bold' };
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? { color: '#080C1A', fontFamily: 'Helvetica-Bold' } : { color: '#FFFFFF', fontFamily: 'Helvetica-Bold' };
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    height: 42,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#062E56', // Prussian Blue
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  metaBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
    width: 250,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  metaRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#475569',
  },
  metaValue: {
    fontSize: 7.5,
    color: '#0f172a',
  },
  tableContainer: {
    marginBottom: 14,
  },
  tableTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#062E56',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    alignItems: 'stretch',
    minHeight: 28,
  },
  trLast: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 28,
  },
  th: {
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    padding: 4,
    textAlign: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  td: {
    padding: 2,
    fontSize: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  employeeColTh: {
    width: 120,
    textAlign: 'left',
    alignItems: 'flex-start',
    paddingLeft: 6,
  },
  employeeColTd: {
    width: 120,
    alignItems: 'flex-start',
    paddingLeft: 6,
  },
  idColTh: {
    width: 35,
  },
  idColTd: {
    width: 35,
    alignItems: 'center',
  },
  dayCol: {
    flex: 1,
  },
  dayColLast: {
    flex: 1,
    borderRightWidth: 0,
  },
  employeeName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#1e293b',
  },
  employeeTeam: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },
  employeeIdText: {
    fontFamily: 'Courier',
    fontSize: 7.5,
    color: '#475569',
  },
  thText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  thSubtext: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },
  dayCellWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    borderRadius: 2,
  },
  dayCellText: {
    fontSize: 7.5,
    textAlign: 'center',
  },
  dayCellSubtext: {
    fontSize: 5.5,
    textAlign: 'center',
    marginTop: 0.5,
    opacity: 0.85,
  },
  dayOffText: {
    color: '#ef4444',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textAlign: 'center',
  },
  legendSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  legendTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#475569',
    marginBottom: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 10,
    height: 10,
    marginRight: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  legendText: {
    fontSize: 7,
    color: '#475569',
  },
});

interface PDFRow {
  employee: Employee;
  entries: Record<DayOfWeek, string | null>;
}

interface PDFHeader {
  day: DayOfWeek;
  label: string;
  dateStr: string;
}

interface PDFDocumentProps {
  dateRangeLabel: string;
  monthLabel: string;
  alabangRows: PDFRow[];
  zamboangaRows: PDFRow[];
  shiftTypes: ShiftType[];
  weekHeaders: PDFHeader[];
}

const SchedulePDFDocument = ({
  dateRangeLabel,
  monthLabel,
  alabangRows,
  zamboangaRows,
  shiftTypes,
  weekHeaders,
}: PDFDocumentProps) => {
  const renderTable = (teamName: string, rows: PDFRow[]) => {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{teamName} Schedule</Text>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tr}>
            <View style={[styles.th, styles.employeeColTh]}>
              <Text style={styles.thText}>Employee</Text>
            </View>
            <View style={[styles.th, styles.idColTh]}>
              <Text style={styles.thText}>ID#</Text>
            </View>
            {weekHeaders.map((h, idx) => (
              <View
                key={h.day}
                style={[styles.th, idx === 6 ? styles.dayColLast : styles.dayCol]}
              >
                <Text style={styles.thText}>{h.label}</Text>
                <Text style={styles.thSubtext}>{h.dateStr}</Text>
              </View>
            ))}
          </View>

          {/* Body Rows */}
          {rows.length === 0 ? (
            <View style={styles.trLast}>
              <View style={[styles.td, { flex: 1, padding: 10, alignItems: 'center' }]}>
                <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  No schedule initialized for this week.
                </Text>
              </View>
            </View>
          ) : (
            rows.map((row, rowIdx) => {
              const isLastRow = rowIdx === rows.length - 1;
              return (
                <View
                  key={row.employee.id}
                  style={isLastRow ? styles.trLast : styles.tr}
                >
                  {/* Employee Info */}
                  <View style={[styles.td, styles.employeeColTd]}>
                    <Text style={styles.employeeName}>{row.employee.name}</Text>
                    <Text style={styles.employeeTeam}>{row.employee.team}</Text>
                  </View>
                  {/* ID */}
                  <View style={[styles.td, styles.idColTd]}>
                    <Text style={styles.employeeIdText}>{row.employee.employeeId}</Text>
                  </View>
                  {/* Days */}
                  {DAYS.map((day, idx) => {
                    const shiftTypeId = row.entries[day];
                    const isLastCol = idx === 6;
                    const shift = shiftTypeId
                      ? shiftTypes.find((s) => s.id === shiftTypeId)
                      : null;

                    return (
                      <View
                        key={day}
                        style={[
                          styles.td,
                          isLastCol ? styles.dayColLast : styles.dayCol,
                          shift ? { backgroundColor: shift.colorHex, padding: 0 } : {},
                        ]}
                      >
                        {!shiftTypeId ? (
                          <Text style={styles.dayOffText}>DAY-OFF</Text>
                        ) : (
                          shift && (
                            <View style={styles.dayCellWrapper}>
                              <Text
                                style={[
                                  styles.dayCellText,
                                  getPdfContrastStyle(shift.colorHex),
                                ]}
                              >
                                {shift.name.replace(' SHIFT', '')}
                              </Text>
                              {shift.startTime && shift.endTime && (
                                <Text
                                  style={[
                                    styles.dayCellSubtext,
                                    getPdfContrastStyle(shift.colorHex),
                                  ]}
                                >
                                  {shift.startTime}–{shift.endTime}
                                </Text>
                              )}
                            </View>
                          )
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  return (
    <Document title={`Shift Schedule - Week of ${dateRangeLabel}`}>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header container */}
        <View style={styles.headerContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>SHIFT SCHEDULE — Month of {monthLabel}</Text>
            <Text style={styles.subtitle}>
              Generated automatically by Aetas Global Scheduler
            </Text>
          </View>

          {/* Top-Right Info Box */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>For the week of:</Text>
              <Text style={styles.metaValue}>{dateRangeLabel}</Text>
            </View>
            <View style={styles.metaRowLast}>
              <Text style={styles.metaLabel}>Company Name:</Text>
              <Text style={styles.metaValue}>AETAS GLOBAL INNOVATION INC</Text>
            </View>
          </View>
        </View>

        {/* Alabang Schedule Table */}
        {renderTable('Team Alabang', alabangRows)}

        {/* Zamboanga Schedule Table */}
        {renderTable('Team Zamboanga', zamboangaRows)}

        {/* Legend Panel */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>SHIFT LEGEND</Text>
          <View style={styles.legendContainer}>
            {shiftTypes.map((shift) => (
              <View key={shift.id} style={styles.legendItem}>
                <View
                  style={[styles.legendColorBox, { backgroundColor: shift.colorHex }]}
                />
                <Text style={styles.legendText}>
                  {shift.name}
                  {shift.startTime && shift.endTime
                    ? ` (${shift.startTime} – ${shift.endTime})`
                    : ''}
                </Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <Text style={[styles.legendColorBox, styles.dayOffText, { borderWidth: 0, marginRight: 2, height: 'auto', width: 'auto', fontSize: 7 }]}>
                DAY-OFF
              </Text>
              <Text style={styles.legendText}>Rest Day (shown in red text)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekDateStr = searchParams.get('weekDate');
    if (!weekDateStr) {
      return new Response('Missing weekDate parameter', { status: 400 });
    }

    const weekStart = parseISO(weekDateStr);
    const weekEnd = addDays(weekStart, 6);
    const dateRangeLabel = formatWeekRange(weekStart, weekEnd);
    const monthLabel = format(weekStart, 'MMMM yyyy').toUpperCase();

    // 1. Fetch shift types
    const shiftTypes = await prisma.shiftType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 2. Fetch active employees
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true },
    });

    const alabangEmployees = allEmployees
      .filter((e) => e.team === Team.ALABANG)
      .sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));

    const zamboangaEmployees = allEmployees
      .filter((e) => e.team === Team.ZAMBOANGA)
      .sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));

    // 3. Fetch schedule weeks
    const alabangWeek = await prisma.scheduleWeek.findUnique({
      where: {
        weekStartDate_team: {
          weekStartDate: weekStart,
          team: Team.ALABANG,
        },
      },
    });

    const zamboangaWeek = await prisma.scheduleWeek.findUnique({
      where: {
        weekStartDate_team: {
          weekStartDate: weekStart,
          team: Team.ZAMBOANGA,
        },
      },
    });

    // 4. Fetch schedule entries
    const alabangEntries = alabangWeek
      ? await prisma.scheduleEntry.findMany({ where: { scheduleWeekId: alabangWeek.id } })
      : [];

    const zamboangaEntries = zamboangaWeek
      ? await prisma.scheduleEntry.findMany({ where: { scheduleWeekId: zamboangaWeek.id } })
      : [];

    // Helper to map entries to employee rows
    const buildRows = (employees: typeof allEmployees, entries: typeof alabangEntries) => {
      return employees.map((employee) => {
        const employeeEntries = {} as Record<DayOfWeek, string | null>;
        DAYS.forEach((day) => {
          const match = entries.find((e) => e.employeeId === employee.id && e.dayOfWeek === day);
          employeeEntries[day] = match ? match.shiftTypeId : null;
        });
        return {
          employee,
          entries: employeeEntries,
        };
      });
    };

    const alabangRows = buildRows(alabangEmployees, alabangEntries);
    const zamboangaRows = buildRows(zamboangaEmployees, zamboangaEntries);

    // Week headers calculations
    const weekHeaders = DAYS.map((day, idx) => {
      const dayDate = addDays(weekStart, idx);
      return {
        day,
        label: DAY_LABELS[day],
        dateStr: format(dayDate, 'd'),
      };
    });

    // Generate PDF Stream
    const pdfBuffer = await renderToBuffer(
      <SchedulePDFDocument
        dateRangeLabel={dateRangeLabel}
        monthLabel={monthLabel}
        alabangRows={alabangRows}
        zamboangaRows={zamboangaRows}
        shiftTypes={shiftTypes}
        weekHeaders={weekHeaders}
      />
    );

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Aetas_Global_Schedule_${weekDateStr}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return new Response('Failed to generate PDF schedule', { status: 500 });
  }
}
