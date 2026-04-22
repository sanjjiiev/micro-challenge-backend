require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Bulletproof CORS Configuration
// It tries to use your Vercel link, but falls back to '*' (allow all) to prevent 404 blocks
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// HEALTH CHECK ROUTE: Keeps the server awake and verifies it's online
app.get('/', (req, res) => {
    res.status(200).send("The Data Challenge Backend is LIVE and routing correctly!");
});

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const COURSE_LINK = "https://alagitech.getlearnworlds.com/course/firststepindataanalysis";

// POST Route: Submit Assessment
app.post('/api/submit-assessment', async (req, res) => {
    try {
        const { email, score, totalQuestions } = req.body;

        if (!email || score === undefined) {
            return res.status(400).json({ success: false, message: 'Email and score are required.' });
        }

        // Save to Supabase
        const { error: dbError } = await supabase
            .from('leads')
            .insert([{ email, score, total_questions: totalQuestions }]);

        if (dbError) throw dbError;

        // Professional Corporate Email Template
        const scorePercentage = (score / totalQuestions) * 100;
        const isHighScorer = score >= 4;

        const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #f97316; margin: 0; font-size: 24px;">AI Marketing Insights Assessment</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.5;">Thank you for completing the technical assessment.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #f97316; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold;">Your Score: ${score} / ${totalQuestions} (${scorePercentage}%)</p>
          </div>

          <p style="font-size: 16px; line-height: 1.5;">
            ${isHighScorer
                ? 'Excellent work. Your results indicate a strong foundational understanding of data analysis, anomaly detection, and business logic.'
                : 'Your results show a foundational understanding, but there are clear areas for improvement in identifying data anomalies and applying technical logic.'}
          </p>

          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
            To further refine your skills in SQL, Python, and data visualization for enterprise environments, we invite you to review our comprehensive training program.
          </p>

          <a href="${COURSE_LINK}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">View the Data Analysis Curriculum</a>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          &copy; ${new Date().getFullYear()} Alagitech. All rights reserved.
        </div>
      </div>
    `;

        await transporter.sendMail({
            from: `"Alagitech Data Training" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Your Assessment Results: ${score}/${totalQuestions}`,
            html: emailHtml,
        });

        res.status(200).json({ success: true, score });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} with Supabase`));