import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, BarChart3Icon, SettingsIcon, PlusIcon, DownloadIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { CategoryManager } from '@/components/CategoryManager';
import { ReportDashboard } from '@/components/ReportDashboard';
import type { 
  TransactionWithCategory, 
  Category, 
  ReportSummary,
  CreateTransactionInput,
  CreateCategoryInput 
} from '../../server/src/schema';

function App() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionsResult, categoriesResult] = await Promise.all([
        trpc.getTransactions.query(),
        trpc.getCategories.query()
      ]);
      setTransactions(transactionsResult);
      setCategories(categoriesResult);

      // Load report summary for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const summary = await trpc.getReportSummary.query({
        start_date: startOfMonth,
        end_date: endOfMonth
      });
      setReportSummary(summary);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTransaction = async (data: CreateTransactionInput) => {
    try {
      const newTransaction = await trpc.createTransaction.mutate(data);
      // Since the API returns Transaction, we need to add category_name
      const category = categories.find(c => c.id === newTransaction.category_id);
      const transactionWithCategory: TransactionWithCategory = {
        ...newTransaction,
        category_name: category?.name || 'Unknown'
      };
      setTransactions((prev: TransactionWithCategory[]) => [transactionWithCategory, ...prev]);
      
      // Reload report summary
      if (reportSummary) {
        const summary = await trpc.getReportSummary.query({
          start_date: reportSummary.period.start_date,
          end_date: reportSummary.period.end_date
        });
        setReportSummary(summary);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };

  const handleCreateCategory = async (data: CreateCategoryInput) => {
    try {
      const newCategory = await trpc.createCategory.mutate(data);
      setCategories((prev: Category[]) => [...prev, newCategory]);
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id });
      setTransactions((prev: TransactionWithCategory[]) => prev.filter(t => t.id !== id));
      
      // Reload report summary
      if (reportSummary) {
        const summary = await trpc.getReportSummary.query({
          start_date: reportSummary.period.start_date,
          end_date: reportSummary.period.end_date
        });
        setReportSummary(summary);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await trpc.deleteCategory.mutate({ id });
      setCategories((prev: Category[]) => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const totalIncome = reportSummary?.total_income || 0;
  const totalExpense = reportSummary?.total_expense || 0;
  const netAmount = reportSummary?.net_amount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <WalletIcon className="h-10 w-10 text-blue-600" />
                💰 Pencatat Keuangan Pribadi
              </h1>
              <p className="text-gray-600 mt-2">Kelola pemasukan dan pengeluaran Anda dengan mudah</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">💚 Total Pemasukan</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                Rp {totalIncome.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {reportSummary?.period ? 
                  `${reportSummary.period.start_date.toLocaleDateString('id-ID')} - ${reportSummary.period.end_date.toLocaleDateString('id-ID')}` : 
                  'Bulan ini'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">💸 Total Pengeluaran</CardTitle>
              <TrendingDownIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                Rp {totalExpense.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-red-600 mt-1">
                {reportSummary?.period ? 
                  `${reportSummary.period.start_date.toLocaleDateString('id-ID')} - ${reportSummary.period.end_date.toLocaleDateString('id-ID')}` : 
                  'Bulan ini'
                }
              </p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${netAmount >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${netAmount >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                {netAmount >= 0 ? '📈' : '📉'} Saldo Bersih
              </CardTitle>
              <BarChart3Icon className={`h-4 w-4 ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                Rp {netAmount.toLocaleString('id-ID')}
              </div>
              <p className={`text-xs mt-1 ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {netAmount >= 0 ? 'Surplus' : 'Defisit'} bulan ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Transaksi
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Laporan
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Kategori
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📋 Transaksi Terbaru
                    <Badge variant="secondary">{transactions.length}</Badge>
                  </CardTitle>
                  <CardDescription>5 transaksi terakhir Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <TransactionList 
                    transactions={transactions.slice(0, 5)} 
                    categories={categories}
                    onDelete={handleDeleteTransaction}
                    showDeleteButton={false}
                  />
                  {transactions.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('transactions')}
                        className="w-full"
                      >
                        Lihat Semua Transaksi
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏷️ Kategori Tersedia
                    <Badge variant="secondary">{categories.length}</Badge>
                  </CardTitle>
                  <CardDescription>Kategori pemasukan dan pengeluaran</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.slice(0, 8).map((category: Category) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <span className="font-medium">{category.name}</span>
                        <Badge variant={category.type === 'income' ? 'default' : 'destructive'}>
                          {category.type === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}
                        </Badge>
                      </div>
                    ))}
                    {categories.length > 8 && (
                      <div className="mt-4 text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab('categories')}
                          className="w-full"
                        >
                          Kelola Kategori
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ➕ Tambah Transaksi Baru
                  </CardTitle>
                  <CardDescription>Catat pemasukan atau pengeluaran Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <TransactionForm 
                    categories={categories} 
                    onSubmit={handleCreateTransaction}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Daftar Transaksi
                    <Badge variant="secondary">{transactions.length}</Badge>
                  </CardTitle>
                  <CardDescription>Semua catatan keuangan Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <TransactionList 
                    transactions={transactions} 
                    categories={categories}
                    onDelete={handleDeleteTransaction}
                    showDeleteButton={true}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportDashboard />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏷️ Kelola Kategori
                </CardTitle>
                <CardDescription>
                  Atur kategori pemasukan dan pengeluaran sesuai kebutuhan Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryManager 
                  categories={categories}
                  onCreateCategory={handleCreateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;