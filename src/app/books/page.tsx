"use client";

import { useState, useEffect } from 'react';
import { listBooksFromStorage, getStorageUrl } from '@/lib/supabase-client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, Library, File, FileText, FileType, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';

interface BookItem {
  name: string;
  id: string;
  metadata: Record<string, any> | null;
  url: string;
  displayName: string;
  fileType: string;
}

export default function BooksPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [activeTab, setActiveTab] = useState('library');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await listBooksFromStorage();
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.data) {
        setBooks([]);
        return;
      }
      
      // Xử lý danh sách sách
      const processedBooks = result.data.map(item => {
        // Lấy tên hiển thị từ tên file (bỏ phần mở rộng)
        const nameParts = item.name.split('.');
        const extension = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : '';
        const displayName = nameParts.join('.').replace(/_/g, ' ').replace(/-/g, ' ');
        
        // Xác định loại file
        const fileType = getFileType(extension || '');
        
        // Tạo URL
        const url = getStorageUrl('books', item.name) || '';
        
        return {
          ...item,
          url,
          displayName,
          fileType
        };
      });
      
      setBooks(processedBooks);
    } catch (err) {
      console.error('Error loading books:', err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách sách');
    } finally {
      setLoading(false);
    }
  };
  
  // Hàm xác định loại file dựa vào phần mở rộng
  const getFileType = (extension: string): string => {
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'epub':
        return 'EPUB';
      case 'mobi':
        return 'MOBI';
      case 'txt':
        return 'Text';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'xls':
      case 'xlsx':
        return 'Excel';
      case 'ppt':
      case 'pptx':
        return 'PowerPoint';
      default:
        return extension.toUpperCase() || 'Unknown';
    }
  };
  
  const handleBookSelect = (book: BookItem) => {
    setSelectedBook(book);
    setActiveTab('viewer');
  };
  
  // Lấy biểu tượng phù hợp cho loại file
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'EPUB':
      case 'MOBI':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case 'Word':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'Excel':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'PowerPoint':
        return <FileText className="h-5 w-5 text-orange-500" />;
      case 'Text':
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thư Viện Sách</h1>
          <p className="text-muted-foreground">Quản lý và đọc sách từ kho lưu trữ Supabase</p>
        </div>
        <Button 
          onClick={loadBooks}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      <Tabs 
        defaultValue="library" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Thư viện
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center gap-2" disabled={!selectedBook}>
            <BookOpen className="h-4 w-4" />
            Đọc sách
          </TabsTrigger>
        </TabsList>

        {/* Tab Thư viện */}
        <TabsContent value="library" className="space-y-4">
          {books.length === 0 && !loading ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Không có sách</h3>
              <p className="text-sm text-muted-foreground">
                Chưa có sách nào được tải lên Supabase Storage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Card key={book.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="px-4 py-3 border-b bg-card">
                    <CardTitle className="text-base font-medium truncate">{book.displayName}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      {getFileIcon(book.fileType)}
                      {book.fileType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center bg-muted rounded-md h-[140px] mb-4">
                      <Book className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">{book.name}</p>
                  </CardContent>
                  <CardFooter className="px-4 py-3 bg-muted/30 border-t flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 flex items-center gap-1"
                      onClick={() => handleBookSelect(book)}
                    >
                      <BookOpen className="h-4 w-4" />
                      Đọc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-1"
                      asChild
                    >
                      <Link href={book.url} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                        Tải về
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Đọc sách */}
        <TabsContent value="viewer" className="space-y-4">
          {selectedBook ? (
            <div className="flex flex-col space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedBook.displayName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {getFileIcon(selectedBook.fileType)}
                      {selectedBook.fileType}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={selectedBook.url} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Mở trong tab mới
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-[800px] border border-border rounded-md overflow-hidden">
                    {selectedBook.fileType === 'PDF' ? (
                      <iframe 
                        src={`${selectedBook.url}#toolbar=0&navpanes=0`} 
                        className="w-full h-full" 
                        title={selectedBook.displayName}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <div className="text-center p-6">
                          <FileType className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium">Không thể xem trực tiếp</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Định dạng {selectedBook.fileType} không hỗ trợ xem trực tiếp trong trình duyệt.
                          </p>
                          <Button asChild>
                            <Link href={selectedBook.url} target="_blank">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Mở/Tải xuống file
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-lg">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Chưa chọn sách</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vui lòng chọn một cuốn sách từ thư viện để đọc.
              </p>
              <Button onClick={() => setActiveTab('library')}>
                Quay lại thư viện
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center">
        <Link href="/">
          <Button variant="outline">Quay lại trang chính</Button>
        </Link>
      </div>
    </div>
  );
} 