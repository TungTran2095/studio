import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus } from "lucide-react";

interface CreateExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateExperiment: (data: any) => void;
}

export function CreateExperimentModal({ isOpen, onClose, onCreateExperiment }: CreateExperimentModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !type) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      await onCreateExperiment({
        name,
        type,
        description,
        status: "pending",
        progress: 0
      });
      onClose();
    } catch (error) {
      console.error("Lỗi khi tạo thí nghiệm:", error);
      alert("Có lỗi xảy ra khi tạo thí nghiệm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl animate-in zoom-in-95 duration-300 fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tạo Thí Nghiệm Mới
          </DialogTitle>
          <DialogDescription>
            Tạo một thí nghiệm mới để nghiên cứu và phân tích dữ liệu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên thí nghiệm</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên thí nghiệm..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Loại thí nghiệm</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại thí nghiệm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backtest">Backtest</SelectItem>
                <SelectItem value="hypothesis_test">Kiểm định giả thuyết</SelectItem>
                <SelectItem value="optimization">Tối ưu hóa</SelectItem>
                <SelectItem value="monte_carlo">Monte Carlo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả thí nghiệm..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo thí nghiệm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 