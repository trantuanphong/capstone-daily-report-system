# 📊 Capstone Daily Report System

## 📌 Mô tả dự án

Hệ thống web quản lý báo cáo hằng ngày dành cho sinh viên thực hiện đồ án capstone. Ứng dụng cho phép sinh viên đăng nhập bằng Google, nộp báo cáo tiến độ mỗi ngày, theo dõi báo cáo của các thành viên trong nhóm và nhận phản hồi từ giảng viên hoặc người đánh giá.

Hệ thống hỗ trợ phân quyền người dùng (sinh viên, người đánh giá, quản trị viên), cho phép duyệt hoặc từ chối báo cáo kèm theo nhận xét, giúp theo dõi tiến độ làm việc của từng nhóm một cách minh bạch và hiệu quả.

Dự án được xây dựng bằng **React + Firebase** và triển khai dễ dàng trên **Vercel**, phù hợp cho môi trường học tập và quản lý đồ án nhóm trong các trường đại học.

---

## 🚀 Tính năng chính

- 🔐 Đăng nhập bằng Google (Firebase Authentication)
- 📝 Sinh viên nộp báo cáo hằng ngày
- 👥 Xem báo cáo của các thành viên trong nhóm
- ✅ Người đánh giá có thể duyệt / từ chối báo cáo
- 💬 Thêm nhận xét cho từng báo cáo
- 👨‍🏫 Quản trị viên quản lý người dùng và nhóm
- 📊 Theo dõi tiến độ theo nhóm

---

## 🧑‍💻 Vai trò người dùng

### 🎓 Sinh viên
- Đăng nhập bằng Gmail
- Tạo và chỉnh sửa báo cáo hằng ngày
- Xem trạng thái báo cáo

### 👨‍🏫 Người đánh giá (Reviewer)
- Xem báo cáo của nhóm được phân công
- Duyệt hoặc từ chối báo cáo
- Gửi nhận xét

### 🛠 Quản trị viên (Admin)
- Quản lý nhóm và người dùng
- Phân quyền reviewer
- Theo dõi toàn bộ hệ thống

---

## 🛠 Công nghệ sử dụng

- ⚛️ React
- 🔥 Firebase (Auth + Firestore)
- 🎨 Tailwind CSS
- ▲ Vercel (Deployment)

---

## 📦 Cài đặt & chạy local

```bash
# Clone repository
git clone https://github.com/your-username/capstone-daily-report-system.git

# Vào thư mục dự án
cd capstone-daily-report-system

# Cài dependencies
npm install

# Chạy development server
npm run dev