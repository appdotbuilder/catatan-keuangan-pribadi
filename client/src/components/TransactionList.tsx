import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Filter, SortDesc } from 'lucide-react';
import type { TransactionWithCategory, Category, TransactionType } from '../../../server/src/schema';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
  onDelete?: (id: number) => void;
  showDeleteButton?: boolean;
}

export function TransactionList({ 
  transactions, 
  categories, 
  onDelete, 
  showDeleteButton = true 
}: TransactionListProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction: TransactionWithCategory) => {
    if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && transaction.category_id.toString() !== categoryFilter) return false;
    return true;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a: TransactionWithCategory, b: TransactionWithCategory) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'amount':
        return b.amount - a.amount;
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (type: TransactionType) => {
    return type === 'income' ? '💰' : '💸';
  };

  if (transactions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-500 mb-2">Belum ada transaksi</p>
            <p className="text-sm text-gray-400">Mulai dengan menambahkan transaksi pertama Anda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="income">💰 Pemasukan</SelectItem>
              <SelectItem value="expense">💸 Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((category: Category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <SortDesc className="h-4 w-4 text-gray-500" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">📅 Tanggal</SelectItem>
              <SelectItem value="amount">💵 Jumlah</SelectItem>
              <SelectItem value="type">🏷️ Jenis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-4">
                <p className="text-gray-500">Tidak ada transaksi yang sesuai dengan filter</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedTransactions.map((transaction: TransactionWithCategory) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                      <div>
                        <h4 className="font-semibold text-lg">{transaction.description}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📅 {formatDate(transaction.date)}</span>
                          <span>•</span>
                          <Badge 
                            variant={transaction.type === 'income' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {transaction.category_name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>

                    {showDeleteButton && onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus transaksi "{transaction.description}"? 
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      {sortedTransactions.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Menampilkan {sortedTransactions.length} dari {transactions.length} transaksi
              </span>
              <div className="flex gap-4">
                <span className="text-green-600">
                  💰 {sortedTransactions.filter(t => t.type === 'income').length} pemasukan
                </span>
                <span className="text-red-600">
                  💸 {sortedTransactions.filter(t => t.type === 'expense').length} pengeluaran
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}