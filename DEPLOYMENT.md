# Graph Visualization App - Deployment Guide

## Deploy trên Render

### Bước 1: Push code lên GitHub
```bash
git add .
git commit -m "Add deployment configuration for Render"
git push origin main
```

### Bước 2: Tạo Web Service trên Render
1. Truy cập https://render.com và đăng nhập
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository: `TruongHoangQuan0301/Cau-Truc-Roi-Rac`
4. Cấu hình:
   - **Name**: `graph-visualization-app` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Root Directory**: để trống
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free`

5. Click **"Create Web Service"**

### Bước 3: Đợi deploy
- Render sẽ tự động build và deploy (khoảng 2-5 phút)
- URL sẽ có dạng: `https://graph-visualization-app.onrender.com`

### Lưu ý:
- **Free tier** sẽ sleep sau 15 phút không hoạt động
- Lần đầu truy cập sau khi sleep sẽ mất 30-60 giây để wake up
- Thư mục `saved_graphs/` sẽ bị xóa khi deploy lại (dùng database để lưu lâu dài)

### Deploy lại:
Mỗi khi push code mới lên GitHub, Render sẽ tự động deploy lại.

```bash
git add .
git commit -m "Update features"
git push origin main
```

## Chạy local (development)
```bash
python app.py
```
Truy cập: http://localhost:5000
