import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import { parseISO, format, addDays } from 'date-fns';
import { formatWeekRange } from '@/lib/utils';
import { Team, DayOfWeek, Employee, ShiftType } from '@prisma/client';
import path from 'path';

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
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    height: 32,
  },
  logoImage: {
    width: 16,
    height: 16,
    objectFit: 'contain',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#062E56', // Prussian Blue
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
  },
  metaBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 32,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 1,
  },
  metaRowLast: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
    marginBottom: 10,
  },
  tableTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#062E56',
    marginBottom: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  table: {
    width: 730,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#cbd5e1',
    borderLeftColor: '#cbd5e1',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 22,
  },
  th: {
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  td: {
    padding: 1,
    fontSize: 6.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  employeeColTh: {
    width: 130,
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 2,
    textAlign: 'left',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 6,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  employeeColTd: {
    width: 130,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 6,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  idColTh: {
    width: 40,
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  idColTd: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderRightColor: '#cbd5e1',
  },
  dayCol: {
    width: 80,
  },
  employeeName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#1e293b',
  },
  employeeTeam: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 0.5,
  },
  employeeIdText: {
    fontFamily: 'Courier',
    fontSize: 7,
    color: '#475569',
  },
  thText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  thSubtext: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 0.5,
  },
  dayCellWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
    borderRadius: 1,
  },
  dayCellText: {
    fontSize: 6.5,
    textAlign: 'center',
  },
  dayCellSubtext: {
    fontSize: 5,
    textAlign: 'center',
    marginTop: 0.5,
    opacity: 0.85,
  },
  dayOffText: {
    color: '#ef4444',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textAlign: 'center',
  },
  legendSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
  legendTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#475569',
    marginBottom: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 8,
    height: 8,
    marginRight: 3,
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  legendText: {
    fontSize: 6.5,
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
  logoPath: string;
  companyName: string;
}

const SchedulePDFDocument = ({
  dateRangeLabel,
  monthLabel,
  alabangRows,
  zamboangaRows,
  shiftTypes,
  weekHeaders,
  logoPath,
  companyName,
}: PDFDocumentProps) => {
  const renderTable = (teamName: string, rows: PDFRow[]) => {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{teamName} Schedule</Text>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tr}>
            <View style={styles.employeeColTh}>
              <Text style={styles.thText}>Employee</Text>
            </View>
            <View style={styles.idColTh}>
              <Text style={styles.thText}>ID#</Text>
            </View>
            {weekHeaders.map((h) => (
              <View key={h.day} style={[styles.th, styles.dayCol]}>
                <Text style={styles.thText}>{h.label}</Text>
                <Text style={styles.thSubtext}>{h.dateStr}</Text>
              </View>
            ))}
          </View>

          {/* Body Rows */}
          {rows.length === 0 ? (
            <View style={styles.tr}>
              <View style={[styles.td, { width: 730, padding: 10, alignItems: 'center' }]}>
                <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  No schedule initialized for this week.
                </Text>
              </View>
            </View>
          ) : (
            rows.map((row) => {
              return (
                <View key={row.employee.id} style={styles.tr}>
                  {/* Employee Info */}
                  <View style={styles.employeeColTd}>
                    <Text style={styles.employeeName}>{row.employee.name}</Text>
                    <Text style={styles.employeeTeam}>{row.employee.team}</Text>
                  </View>
                  {/* ID */}
                  <View style={styles.idColTd}>
                    <Text style={styles.employeeIdText}>{row.employee.employeeId}</Text>
                  </View>
                  {/* Days */}
                  {DAYS.map((day) => {
                    const shiftTypeId = row.entries[day];
                    const shift = shiftTypeId
                      ? shiftTypes.find((s) => s.id === shiftTypeId)
                      : null;

                    return (
                      <View
                        key={day}
                        style={[
                          styles.td,
                          styles.dayCol,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <PdfImage src={logoPath} style={styles.logoImage} />
              <Text style={styles.title}>SHIFT SCHEDULE — Month of {monthLabel}</Text>
            </View>
            <Text style={styles.subtitle}>
              Generated automatically by Aetas Global Scheduler
            </Text>
          </View>

          {/* Top-Right Info Box */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>For the week of: </Text>
              <Text style={styles.metaValue}>{dateRangeLabel}</Text>
            </View>
            <View style={styles.metaRowLast}>
              <Text style={styles.metaLabel}>Company Name: </Text>
              <Text style={styles.metaValue}>{companyName}</Text>
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
    const logoPath = path.join(process.cwd(), 'public', 'ATS_logo.PNG');
    const companyName = searchParams.get('companyName') || 'AETAS GLOBAL INNOVATION INC';

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
        logoPath={logoPath}
        companyName={companyName}
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
