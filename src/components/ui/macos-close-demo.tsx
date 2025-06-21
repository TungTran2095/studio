import React, { useState } from 'react';
import { Button } from './button';
import { MacOSCloseButton, MacOSWindowCloseButton } from './macos-close-button';
import { MacOSModal, MacOSFullScreenModal } from './macos-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export function MacOSCloseDemo() {
  const [showModal, setShowModal] = useState(false);
  const [showFullScreenModal, setShowFullScreenModal] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">MacOS Style Close Buttons Demo</h1>
        <p className="text-muted-foreground mb-6">
          Các nút đóng giống macOS với hiệu ứng mượt mà
        </p>
      </div>

      {/* Basic Close Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Nút đóng cơ bản</CardTitle>
          <CardDescription>
            Các kích thước và biến thể khác nhau của nút đóng macOS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Nhỏ:</span>
            <MacOSCloseButton onClick={() => alert('Nhỏ')} size="sm" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Trung bình:</span>
            <MacOSCloseButton onClick={() => alert('Trung bình')} size="md" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Lớn:</span>
            <MacOSCloseButton onClick={() => alert('Lớn')} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Window Style Close Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Nút đóng kiểu cửa sổ</CardTitle>
          <CardDescription>
            Nút đóng với icon luôn hiển thị, phù hợp cho title bar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Nhỏ:</span>
            <MacOSWindowCloseButton onClick={() => alert('Window - Nhỏ')} size="sm" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Trung bình:</span>
            <MacOSWindowCloseButton onClick={() => alert('Window - Trung bình')} size="md" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Lớn:</span>
            <MacOSWindowCloseButton onClick={() => alert('Window - Lớn')} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Modal Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Modal với nút đóng macOS</CardTitle>
          <CardDescription>
            Các modal sử dụng nút đóng macOS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowModal(true)}>
              Mở Modal Thường
            </Button>
            <Button onClick={() => setShowFullScreenModal(true)}>
              Mở Modal Full Screen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regular Modal */}
      <MacOSModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Modal Thường"
        description="Modal với nút đóng macOS ở góc trên bên phải"
      >
        <div className="space-y-4">
          <p>Đây là nội dung của modal thường với nút đóng macOS.</p>
          <p>Bạn có thể click vào nút đóng màu đỏ ở góc trên bên phải để đóng modal.</p>
          <div className="flex justify-end">
            <Button onClick={() => setShowModal(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </MacOSModal>

      {/* Full Screen Modal */}
      <MacOSFullScreenModal
        isOpen={showFullScreenModal}
        onClose={() => setShowFullScreenModal(false)}
        title="Modal Full Screen"
        description="Modal toàn màn hình với nút đóng macOS lớn hơn"
      >
        <div className="space-y-4">
          <p>Đây là nội dung của modal full screen với nút đóng macOS.</p>
          <p>Modal này chiếm toàn bộ màn hình và có nút đóng lớn hơn.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tính năng 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Mô tả tính năng 1</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tính năng 2</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Mô tả tính năng 2</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowFullScreenModal(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </MacOSFullScreenModal>
    </div>
  );
} 