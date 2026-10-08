# Smart Attend — Mobile Ready v3

A responsive prototype for QR attendance.

## Demo accounts
- Student: `2024050518` / `1234`
- Lecturer: `lecturer` / `lecturer123`
- Admin: `admin` / `admin123`
- Developer: `developer` / `dev123`

## Important v3 fix
The session code is now **portable across phones**. It no longer depends on the lecturer phone's LocalStorage to validate a code. Example format: `SA-1ABCDE`.

The QR contains the portable session code and session metadata. Students can scan the QR or type the session code manually.

## Mobile use
For QR camera scanning, run the folder from a local web server or HTTPS page. Browsers commonly block camera access on `file://` pages.

Example with Python:
`python -m http.server 8000`
Then open `http://localhost:8000` on the computer. For a phone on the same Wi-Fi, use the computer's LAN IP instead of localhost.

## Prototype limitation
This remains a front-end/local-storage prototype. Attendance recorded on a student's phone is stored on that phone and will not automatically appear on the lecturer's phone/laptop. A real deployment needs a shared backend/database (e.g. API + SQL database/Firebase/Supabase).
