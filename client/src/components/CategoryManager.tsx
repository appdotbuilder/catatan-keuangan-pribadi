import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Category, CreateCategoryInput, TransactionType } from '../../../server/src/schema';

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (data: CreateCategoryInput) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

export function CategoryManager({ 
  categories, 
  onCreateCategory, 
  onDeleteCategory 
}: CategoryManagerProps) {
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    type: 'expense' as TransactionType,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Nama kategori tidak boleh kosong');
      }

      // Check if category name already exists for this type
      const existingCategory = categories.find((cat: Category) => 
        cat.name.toLowerCase() === formData.name.toLowerCase() && 
        cat.type === formData.type
      );
      
      if (existingCategory) {
        throw new Error(`Kategori "${formData.name}" sudah ada untuk jenis ${formData.type === 'income' ? 'pemasukan' : 'pengeluaran'}`);
      }

      await onCreateCategory(formData);
      
      // Reset form
      setFormData({
        name: '',
        type: 'expense' as TransactionType,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDeleteCategory(id);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const incomeCategories = categories.filter((cat: Category) => cat.type === 'income');
  const expenseCategories = categories.filter((cat: Category) => cat.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Add New Category Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Kategori Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">🏷️ Nama Kategori</Label>
                <Input
                  id="categoryName"
                  placeholder="Contoh: Gaji, Makanan, Transport..."
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>💰 Jenis Kategori</Label>
                <RadioGroup 
                  value={formData.type} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateCategoryInput) => ({ ...prev, type: value as TransactionType }))
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income-cat" />
                    <Label htmlFor="income-cat" className="cursor-pointer">
                      💰 Pemasukan
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense-cat" />
                    <Label htmlFor="expense-cat" className="cursor-pointer">
                      💸 Pengeluaran
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Menyimpan...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Kategori
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Existing Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                💰 Kategori Pemasukan
              </span>
              <Badge variant="secondary">{incomeCategories.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📈</div>
                <p>Belum ada kategori pemasukan</p>
                <p className="text-sm text-gray-400 mt-1">Buat kategori pertama Anda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomeCategories.map((category: Category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-200">
                    <div>
                      <h4 className="font-medium text-green-800">{category.name}</h4>
                      <p className="text-xs text-green-600">
                        Dibuat: {new Date(category.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus kategori "{category.name}"? 
                            Semua transaksi dengan kategori ini akan terpengaruh.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                💸 Kategori Pengeluaran
              </span>
              <Badge variant="secondary">{expenseCategories.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📉</div>
                <p>Belum ada kategori pengeluaran</p>
                <p className="text-sm text-gray-400 mt-1">Buat kategori pertama Anda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseCategories.map((category: Category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200">
                    <div>
                      <h4 className="font-medium text-red-800">{category.name}</h4>
                      <p className="text-xs text-red-600">
                        Dibuat: {new Date(category.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus kategori "{category.name}"? 
                            Semua transaksi dengan kategori ini akan terpengaruh.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Tips Mengelola Kategori:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Buat kategori yang spesifik untuk tracking yang lebih detail</li>
                <li>• Gunakan kategori pemasukan untuk: Gaji, Bonus, Investasi, dll.</li>
                <li>• Gunakan kategori pengeluaran untuk: Makanan, Transport, Belanja, dll.</li>
                <li>• Hindari menghapus kategori yang sudah memiliki transaksi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}