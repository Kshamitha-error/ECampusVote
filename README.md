eCampus Vote
---------------------------
An online voting system for college elections built with React and Flask. Students can register and vote, admins can manage elections and candidates.
Run Locally
---------------------------
To run this project you need:
* Python 3.11+
* Node.js and npm
* Ngrok
Steps
----------------------------
1. Clone the project.
2. Go to the backend folder and install dependencies.
   ```bash
   cd backend
   pip install -r requirements.txt
3. Create a `.env` file inside `backend/` and fill in your details:
   ```env
   DATABASE_URL=sqlite:///voting.db
   JWT_SECRET_KEY=any_random_secret_key
   ADMIN_EMAIL=your_admin_email
   ADMIN_PASSWORD=your_admin_password
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your_gmail
   MAIL_PASSWORD=your_app_password
   ```
4. Run the backend.
   ```bash
   python app.py
   ```
5. In a new terminal, run ngrok to get a public URL.
   ```bash
   ngrok http 5000
   ```
   Copy the URL it gives you (looks like `https://abc123.ngrok-free.app`).
6. Go to the frontend folder and install dependencies.
   ```bash
   cd ../frontend
   npm install
   ```
7. Set the backend URL in your frontend `.env`:
   ```
   REACT_APP_API_URL=https://abc123.ngrok-free.app
   ```
8. Start the frontend.
   ```bash
   npm start
   ```
9. Open `http://localhost:3000` in your browser.

Note:The admin account is created automatically from your `.env` file when you start the backend. Don't commit your `.env` to GitHub.

---
Features
---------------------------
Admin:
---------------------------
* Add students to the system
* Create elections and set start/end time
* Add candidates with photo, symbol and manifesto
* View live vote counts
* Announce results or delete polls
Student:
---------------------------
* Login with college email and roll number
* OTP verification via email
* View candidates(photos,manifesto,acheivements) and cast vote
* Get notified when a new election starts
* View results after they are announced
---
Improvements:
--------------------------
* Better UI
* Docker support
* Handle tie situations in results
* Deploy on cloud


