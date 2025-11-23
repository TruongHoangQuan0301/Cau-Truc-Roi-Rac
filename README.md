# Graph Visualization App

Ứng dụng web để vẽ và quản lý đồ thị sử dụng Flask và NetworkX.

## Tính năng

- ✅ Vẽ đồ thị tương tác trên Canvas
- ✅ Hỗ trợ đồ thị có hướng và vô hướng
- ✅ Thêm node bằng cách Ctrl + Click
- ✅ Nối các node bằng cách Shift + Click
- ✅ Di chuyển node bằng cách kéo thả
- ✅ Zoom (lăn chuột) và Pan (kéo chuột phải)
- ✅ Layout tự động (Spring và Circular)
- ✅ Lưu và tải đồ thị từ file JSON
- ✅ Hiển thị thống kê đồ thị
- ✅ Giao diện tiếng Việt

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/TruongHoangQuan0301/Cau-Truc-Roi-Rac.git
cd Cau-Truc-Roi-Rac
```

2. Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

3. Chạy ứng dụng:
```bash
python app.py
```

4. Mở trình duyệt và truy cập: `http://localhost:5000`

## Hướng dẫn sử dụng

### Thao tác với đồ thị:
- **Thêm node**: Giữ `Ctrl` + Click chuột trái
- **Nối node**: Giữ `Shift` + Click vào 2 node
- **Di chuyển node**: Kéo thả bằng chuột trái
- **Zoom**: Lăn chuột
- **Pan**: Kéo chuột phải

### Lưu và tải:
- **Lưu đồ thị**: Click "💾 Lưu Đồ Thị", nhập tên file
- **Tải đồ thị**: Click "📂 Tải Đồ Thị", chọn file từ danh sách

### Layout:
- **Spring Layout**: Sắp xếp node theo thuật toán lò xo
- **Circular Layout**: Sắp xếp node thành hình tròn

## Công nghệ sử dụng

- **Backend**: Flask 3.0.0, NetworkX 3.2
- **Frontend**: HTML5 Canvas, Vanilla JavaScript, CSS3
- **Data**: JSON để lưu trữ đồ thị

## Cấu trúc dự án

```
graph_visualization_app/
│
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
│
├── templates/
│   └── index.html         # Giao diện chính
│
├── static/
│   ├── style.css          # CSS styling
│   └── script.js          # JavaScript logic
│
└── saved_graphs/          # Thư mục lưu đồ thị (tự động tạo)
```

## License

MIT
