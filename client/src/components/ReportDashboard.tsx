import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, DownloadIcon, TrendingUpIcon, TrendingDownIcon, BarChart3Icon, PieChartIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { ReportSummary, CategoryReport, DateRange } from '../../../server/src/schema';

export function ReportDashboard() {
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [categoryReport, setCategoryReport] = useState<CategoryReport[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [quickRangeSelected, setQuickRangeSelected] = useState('current_month');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, categoryData] = await Promise.all([
        trpc.getReportSummary.query(dateRange),
        trpc.getCategoryReport.query(dateRange),
      ]);
      setReportSummary(summary);
      setCategoryReport(categoryData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleQuickRangeChange = (range: string) => {
    setQuickRangeSelected(range);
    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_30_days':
        start = new Date(now.setDate(now.getDate() - 30));
        end = new Date();
        break;
      case 'last_90_days':
        start = new Date(now.setDate(now.getDate() - 90));
        end = new Date();
        break;
      default:
        return;
    }

    setDateRange({ start_date: start, end_date: end });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Since this is a stub implementation, we'll show a notification
      // In real implementation, this would download an Excel file
      await trpc.exportExcelReport.mutate(dateRange);
      
      // Create a dummy download for demonstration
      const csvContent = generateCSVReport();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan-keuangan-${formatDate(dateRange.start_date)}-${formatDate(dateRange.end_date)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSVReport = () => {
    if (!reportSummary) return '';
    
    let csv = 'Laporan Keuangan Pribadi\n\n';
    csv += `Periode:,${formatDate(dateRange.start_date)} - ${formatDate(dateRange.end_date)}\n\n`;
    csv += 'Ringkasan:\n';
    csv += `Total Pemasukan:,Rp ${reportSummary.total_income.toLocaleString('id-ID')}\n`;
    csv += `Total Pengeluaran:,Rp ${reportSummary.total_expense.toLocaleString('id-ID')}\n`;
    csv += `Saldo Bersih:,Rp ${reportSummary.net_amount.toLocaleString('id-ID')}\n`;
    csv += `Jumlah Transaksi:,${reportSummary.transactions_count}\n\n`;
    
    if (categoryReport.length > 0) {
      csv += 'Laporan per Kategori:\n';
      csv += 'Kategori,Jenis,Jumlah,Total Transaksi\n';
      categoryReport.forEach((cat: CategoryReport) => {
        csv += `${cat.category_name},${cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},Rp ${cat.total_amount.toLocaleString('id-ID')},${cat.transactions_count}\n`;
      });
    }
    
    return csv;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID');
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const incomeCategories = categoryReport.filter((cat: CategoryReport) => cat.type === 'income');
  const expenseCategories = categoryReport.filter((cat: CategoryReport) => cat.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            📅 Pilih Periode Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Range Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">⚡ Pilihan Cepat</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  variant={quickRangeSelected === 'current_month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRangeChange('current_month')}
                >
                  Bulan Ini
                </Button>
                <Button
                  variant={quickRangeSelected === 'last_month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRangeChange('last_month')}
                >
                  Bulan Lalu
                </Button>
                <Button
                  variant={quickRangeSelected === 'current_year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRangeChange('current_year')}
                >
                  Tahun Ini
                </Button>
                <Button
                  variant={quickRangeSelected === 'last_30_days' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRangeChange('last_30_days')}
                >
                  30 Hari
                </Button>
                <Button
                  variant={quickRangeSelected === 'last_90_days' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRangeChange('last_90_days')}
                >
                  90 Hari
                </Button>
              </div>
            </div>

            <Separator />

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="startDate">📅 Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formatDateForInput(dateRange.start_date)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setQuickRangeSelected('custom');
                    setDateRange(prev => ({ ...prev, start_date: new Date(e.target.value) }));
                  }}
                />
              </div>

              <div>
                <Label htmlFor="endDate">📅 Tanggal Selesai</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formatDateForInput(dateRange.end_date)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setQuickRangeSelected('custom');
                    setDateRange(prev => ({ ...prev, end_date: new Date(e.target.value) }));
                  }}
                />
              </div>

              <Button onClick={handleExport} disabled={isExporting || !reportSummary} className="w-full">
                {isExporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Mengekspor...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    📊 Ekspor Excel/CSV
                  </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat laporan...</p>
            </div>
          </CardContent>
        </Card>
      ) : reportSummary ? (
        <>
          {/* Summary Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3Icon className="h-5 w-5" />
                📊 Ringkasan Keuangan
              </CardTitle>
              <p className="text-sm text-gray-600">
                Periode: {formatDate(reportSummary.period.start_date)} - {formatDate(reportSummary.period.end_date)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <TrendingUpIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800 mb-1">💰 Total Pemasukan</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportSummary.total_income)}
                  </p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <TrendingDownIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-red-800 mb-1">💸 Total Pengeluaran</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportSummary.total_expense)}
                  </p>
                </div>

                <div className={`text-center p-4 rounded-lg border-2 ${
                  reportSummary.net_amount >= 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <BarChart3Icon className={`h-8 w-8 mx-auto mb-2 ${
                    reportSummary.net_amount >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <h3 className={`font-semibold mb-1 ${
                    reportSummary.net_amount >= 0 ? 'text-blue-800' : 'text-orange-800'
                  }`}>
                    {reportSummary.net_amount >= 0 ? '📈' : '📉'} Saldo Bersih
                  </h3>
                  <p className={`text-2xl font-bold ${
                    reportSummary.net_amount >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(reportSummary.net_amount)}
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-3xl mb-2">📝</div>
                  <h3 className="font-semibold text-gray-800 mb-1">Jumlah Transaksi</h3>
                  <p className="text-2xl font-bold text-gray-600">
                    {reportSummary.transactions_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Reports */}
          {categoryReport.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      💰 Kategori Pemasukan
                    </span>
                    <Badge variant="secondary">{incomeCategories.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">📈</div>
                      <p>Tidak ada pemasukan dalam periode ini</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incomeCategories
                        .sort((a: CategoryReport, b: CategoryReport) => b.total_amount - a.total_amount)
                        .map((category: CategoryReport) => (
                        <div key={category.category_id} className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-200">
                          <div className="flex-1">
                            <h4 className="font-medium text-green-800">{category.category_name}</h4>
                            <p className="text-xs text-green-600">
                              {category.transactions_count} transaksi
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-700">
                              {formatCurrency(category.total_amount)}
                            </p>
                            <p className="text-xs text-green-600">
                              {reportSummary.total_income > 0 
                                ? ((category.total_amount / reportSummary.total_income) * 100).toFixed(1)
                                : 0}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      💸 Kategori Pengeluaran
                    </span>
                    <Badge variant="secondary">{expenseCategories.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">📉</div>
                      <p>Tidak ada pengeluaran dalam periode ini</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenseCategories
                        .sort((a: CategoryReport, b: CategoryReport) => b.total_amount - a.total_amount)
                        .map((category: CategoryReport) => (
                        <div key={category.category_id} className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200">
                          <div className="flex-1">
                            <h4 className="font-medium text-red-800">{category.category_name}</h4>
                            <p className="text-xs text-red-600">
                              {category.transactions_count} transaksi
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-700">
                              {formatCurrency(category.total_amount)}
                            </p>
                            <p className="text-xs text-red-600">
                              {reportSummary.total_expense > 0 
                                ? ((category.total_amount / reportSummary.total_expense) * 100).toFixed(1)
                                : 0}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Financial Insights */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800 mb-2">Insight Keuangan:</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    {reportSummary.net_amount > 0 ? (
                      <p>✅ Selamat! Anda memiliki surplus sebesar {formatCurrency(reportSummary.net_amount)} dalam periode ini.</p>
                    ) : reportSummary.net_amount < 0 ? (
                      <p>⚠️ Perhatian: Anda mengalami defisit sebesar {formatCurrency(Math.abs(reportSummary.net_amount))} dalam periode ini.</p>
                    ) : (
                      <p>⚖️ Pemasukan dan pengeluaran Anda berimbang dalam periode ini.</p>
                    )}
                    
                    {reportSummary.total_expense > 0 && reportSummary.total_income > 0 && (
                      <p>
                        📊 Rasio pengeluaran terhadap pemasukan: {((reportSummary.total_expense / reportSummary.total_income) * 100).toFixed(1)}%
                      </p>
                    )}
                    
                    {reportSummary.transactions_count > 0 && (
                      <p>
                        📝 Rata-rata per transaksi: {formatCurrency((reportSummary.total_income + reportSummary.total_expense) / reportSummary.transactions_count)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 mb-2">Tidak ada data untuk periode yang dipilih</p>
              <p className="text-sm text-gray-400">Coba pilih periode yang berbeda</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}