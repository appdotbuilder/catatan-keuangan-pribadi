import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import type { Category, CreateTransactionInput, TransactionType } from '../../../server/src/schema';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  isLoading?: boolean;
}

export function TransactionForm({ categories, onSubmit, isLoading = false }: TransactionFormProps) {
  const [formData, setFormData] = useState<CreateTransactionInput>({
    amount: 0,
    description: '',
    date: new Date(),
    category_id: 0,
    type: 'expense' as TransactionType,
  });
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    try {
      if (formData.amount <= 0) {
        throw new Error('Jumlah harus lebih dari 0');
      }
      if (!formData.description.trim()) {
        throw new Error('Deskripsi tidak boleh kosong');
      }
      if (formData.category_id === 0) {
        throw new Error('Silakan pilih kategori');
      }

      await onSubmit(formData);
      
      // Reset form after successful submission
      setFormData({
        amount: 0,
        description: '',
        date: new Date(),
        category_id: 0,
        type: 'expense' as TransactionType,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev: CreateTransactionInput) => ({ ...prev, amount: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setFormData((prev: CreateTransactionInput) => ({ ...prev, date }));
  };

  const handleTypeChange = (value: string) => {
    const type = value as TransactionType;
    setFormData((prev: CreateTransactionInput) => ({ 
      ...prev, 
      type,
      category_id: 0 // Reset category when type changes
    }));
  };

  const filteredCategories = categories.filter((category: Category) => category.type === formData.type);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Jenis Transaksi</Label>
        <RadioGroup value={formData.type} onValueChange={handleTypeChange} className="flex gap-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="income" id="income" />
            <Label htmlFor="income" className="cursor-pointer flex items-center gap-2">
              💰 Pemasukan
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="expense" id="expense" />
            <Label htmlFor="expense" className="cursor-pointer flex items-center gap-2">
              💸 Pengeluaran
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-semibold">💵 Jumlah (Rp)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0"
          value={formData.amount || ''}
          onChange={handleAmountChange}
          min="0"
          step="1000"
          className="text-lg"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">🏷️ Kategori</Label>
        <Select 
          value={formData.category_id.toString()} 
          onValueChange={(value) => setFormData((prev: CreateTransactionInput) => ({ 
            ...prev, 
            category_id: parseInt(value) 
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kategori..." />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Tidak ada kategori untuk {formData.type === 'income' ? 'pemasukan' : 'pengeluaran'}
              </div>
            ) : (
              filteredCategories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {filteredCategories.length === 0 && (
          <p className="text-xs text-gray-500">
            💡 Tip: Buat kategori {formData.type === 'income' ? 'pemasukan' : 'pengeluaran'} di tab Kategori terlebih dahulu
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">📝 Deskripsi</Label>
        <Textarea
          id="description"
          placeholder="Tulis deskripsi transaksi..."
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateTransactionInput) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
          required
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date" className="text-base font-semibold">📅 Tanggal</Label>
        <Input
          id="date"
          type="date"
          value={formatDateForInput(formData.date)}
          onChange={handleDateChange}
          max={formatDateForInput(new Date())}
          required
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isLoading || submitLoading || filteredCategories.length === 0}
        className="w-full text-lg py-6"
      >
        {submitLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Menyimpan...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            ➕ Simpan Transaksi
          </div>
        )}
      </Button>
    </form>
  );
}