# Graph Visualization App - Ứng Dụng Trực Quan Hóa Đồ Thị

Ứng dụng web để vẽ, quản lý và phân tích đồ thị sử dụng Flask và NetworkX.

## 🌟 Tính năng

### Cơ bản
- ✅ Vẽ đồ thị tương tác trên Canvas HTML5
- ✅ Hỗ trợ đồ thị có hướng và vô hướng
- ✅ Thêm đỉnh: Ctrl + Click hoặc nhập tên đỉnh
- ✅ Thêm cạnh: Shift + Click hoặc nhập 2 đỉnh
- ✅ Di chuyển đỉnh: Kéo thả bằng chuột
- ✅ Xóa đỉnh và xóa cạnh
- ✅ Zoom (lăn chuột) và Pan (kéo chuột phải)
- ✅ Trọng số tùy chỉnh cho các cạnh

### Thuật toán cơ bản
- 🔍 **Tìm đường đi ngắn nhất** (Dijkstra)
- 🌳 **Duyệt đồ thị**: BFS và DFS với animation
- 🔄 **Kiểm tra đồ thị 2 phía** (Bipartite)

### Thuật toán nâng cao
- 🌲 **Prim** - Cây khung nhỏ nhất (MST)
- 🌲 **Kruskal** - Cây khung nhỏ nhất (MST)
- 🔄 **Fleury** - Đường đi Euler
- 🔄 **Hierholzer** - Chu trình Euler
- 💧 **Ford-Fulkerson** - Luồng cực đại

### Biểu diễn đồ thị
- 📊 Ma trận kề (Adjacency Matrix)
- 📋 Danh sách kề (Adjacency List)
- 📝 Danh sách cạnh (Edge List)

### Quản lý
- 💾 Lưu và tải đồ thị (JSON format)
- 📊 Thống kê đồ thị (số đỉnh, cạnh, mật độ, liên thông)
- 🎨 Giao diện tiếng Việt với theme gradient tím

## 🚀 Demo Live

**URL**: [https://cau-truc-roi-rac.onrender.com](https://cau-truc-roi-rac.onrender.com)

*(Lưu ý: Free tier có thể mất 30-60 giây để wake up sau khi sleep)*

## 💻 Cài đặt và Chạy Local

### Yêu cầu
- Python 3.11+
- pip

### Các bước

1. **Clone repository:**
```bash
git clone https://github.com/TruongHoangQuan0301/Cau-Truc-Roi-Rac.git
cd Cau-Truc-Roi-Rac
```

2. **Cài đặt dependencies:**
```bash
pip install -r requirements.txt
```

3. **Chạy ứng dụng:**
```bash
python app.py
```

4. **Mở trình duyệt:**
```
http://localhost:5000
```

## 📖 Hướng dẫn sử dụng

### Thao tác cơ bản
- **Thêm đỉnh**: Giữ `Ctrl` + Click chuột trái, hoặc nhập tên đỉnh
- **Nối đỉnh**: Giữ `Shift` + Click vào 2 đỉnh, hoặc nhập 2 đỉnh
- **Di chuyển đỉnh**: Kéo thả bằng chuột trái
- **Zoom**: Lăn chuột
- **Pan**: Kéo chuột phải
- **Xóa đỉnh**: Nhập tên đỉnh cần xóa
- **Xóa cạnh**: Nhập 2 đỉnh của cạnh cần xóa

### Thuật toán
1. **Đường đi ngắn nhất**: Nhập đỉnh bắt đầu và kết thúc
2. **BFS/DFS**: Nhập đỉnh bắt đầu, xem animation
3. **Prim/Kruskal**: Bấm nút, cạnh MST highlight màu xanh
4. **Fleury**: Tìm đường đi Euler với animation
5. **Hierholzer**: Tìm chu trình Euler với animation
6. **Ford-Fulkerson**: Nhập đỉnh nguồn và đích, xem luồng cực đại

### Lưu và tải
- **Lưu đồ thị**: Bấm "💾 Lưu Đồ Thị", nhập tên file
- **Tải đồ thị**: Bấm "📂 Tải Đồ Thị", chọn file từ danh sách

## 🏗️ Công nghệ sử dụng

- **Backend**: Flask 3.0.0, NetworkX 3.2
- **Frontend**: HTML5 Canvas, Vanilla JavaScript, CSS3
- **Deployment**: Render (gunicorn)
- **Data**: JSON để lưu trữ đồ thị

## 📁 Cấu trúc dự án

```
graph_visualization_app/
│
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
├── Procfile               # Render deployment config
├── runtime.txt            # Python version for Render
├── DEPLOYMENT.md          # Hướng dẫn deploy chi tiết
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

## 🌐 Deploy lên Render

Xem hướng dẫn chi tiết trong file [DEPLOYMENT.md](DEPLOYMENT.md)

**Tóm tắt:**
1. Push code lên GitHub
2. Tạo Web Service trên [Render](https://render.com)
3. Connect repository
4. Render tự động deploy

## 🎓 Ứng dụng

Dự án này phù hợp cho:
- Học tập về lý thuyết đồ thị
- Thực hành các thuật toán đồ thị
- Trực quan hóa các bài toán đồ thị
- Demo cho môn Cấu trúc rời rạc

## 📝 License

MIT

## 👨‍💻 Tác giả

TruongHoangQuan0301

## 🔗 Links

- **Repository**: https://github.com/TruongHoangQuan0301/Cau-Truc-Roi-Rac
- **Live Demo**: https://cau-truc-roi-rac.onrender.com
