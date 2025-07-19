const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter for email sending
const createTransporter = () => {
    // For development, use Gmail or a test service
    // In production, you'd use a proper email service like SendGrid, AWS SES, etc.
    
    if (process.env.NODE_ENV === 'production') {
        // Production email configuration
        return nodemailer.createTransport({
            service: 'gmail', // or your email service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Development: Use Ethereal Email for testing
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_USER || 'test@ethereal.email',
                pass: process.env.ETHEREAL_PASS || 'test123'
            }
        });
    }
};

// Send invite email to new employee
const sendInviteEmail = async (employeeData, inviteCode) => {
    try {
        const transporter = createTransporter();
        
        // Generate invite link
        const baseUrl = process.env.FRONTEND_URL || 
                       (process.env.NODE_ENV === 'production' ? 'https://chronoshr.onrender.com' : 'http://localhost:3000');
        const inviteLink = `${baseUrl}/invite/${inviteCode}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@company.com',
            to: employeeData.email,
            subject: 'You\'ve been invited to join our organization!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #667eea; margin: 0;">🎉 You're Invited!</h1>
                        </div>
                        
                        <div style="margin-bottom: 25px;">
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Hi <strong>${employeeData.first_name} ${employeeData.last_name}</strong>,
                            </p>
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                You've been invited to join our organization as a <strong>${employeeData.job_title}</strong>. We're excited to have you on board!
                            </p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
                            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Join Our Team</h2>
                            <a href="${inviteLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; margin: 10px 0;">
                                Accept Invitation
                            </a>
                            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
                                Or copy this link: <span style="font-family: monospace; background: #f1f3f4; padding: 4px 8px; border-radius: 4px;">${inviteLink}</span>
                            </p>
                        </div>
                        
                        <div style="margin-bottom: 25px;">
                            <h3 style="color: #333; margin: 0 0 15px 0;">What happens next?</h3>
                            <ol style="color: #555; font-size: 16px; line-height: 1.6; padding-left: 20px;">
                                <li>Click the "Accept Invitation" button above</li>
                                <li>Complete your account setup</li>
                                <li>Set up your password</li>
                                <li>Start collaborating with your team!</li>
                            </ol>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 25px 0;">
                            <p style="color: #856404; font-size: 14px; margin: 0;">
                                <strong>Important:</strong> This invitation expires in 7 days. Please complete your setup before then.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                If you have any questions, please contact your administrator or IT support.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Invitation email sent successfully');
        console.log('📧 Message ID:', info.messageId);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
        };
        
    } catch (error) {
        console.error('❌ Error sending invitation email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Send invitation acceptance notification to admin
const sendInvitationAcceptanceEmail = async (invitationData, userData, adminData) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@company.com',
            to: adminData.email,
            subject: `Invitation Accepted - ${userData.first_name} ${userData.last_name} joined your organization`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #28a745; margin: 0;">🎉 New Team Member Joined!</h1>
                        </div>
                        
                        <div style="margin-bottom: 25px;">
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Hi <strong>${adminData.first_name} ${adminData.last_name}</strong>,
                            </p>
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Great news! <strong>${userData.first_name} ${userData.last_name}</strong> has accepted your invitation to join <strong>${invitationData.organization_name}</strong>.
                            </p>
                        </div>
                        
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 6px; margin: 25px 0;">
                            <h3 style="color: #155724; margin: 0 0 15px 0;">New Member Details:</h3>
                            <ul style="color: #155724; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                <li><strong>Name:</strong> ${userData.first_name} ${userData.last_name}</li>
                                <li><strong>Email:</strong> ${userData.email}</li>
                                <li><strong>Role:</strong> ${invitationData.role || 'Organization Member'}</li>
                                <li><strong>Joined:</strong> ${new Date().toLocaleDateString()}</li>
                            </ul>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 25px 0;">
                            <p style="color: #856404; font-size: 14px; margin: 0;">
                                <strong>Next Steps:</strong> You can now manage this user's permissions and assign them to teams through your admin dashboard.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Welcome to the team! We're excited to have you on board.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Invitation acceptance email sent successfully');
        return {
            success: true,
            messageId: info.messageId
        };
        
    } catch (error) {
        console.error('❌ Error sending invitation acceptance email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Send welcome email after successful registration
const sendWelcomeEmail = async (employeeData) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@company.com',
            to: employeeData.email,
            subject: 'Account Setup Complete - Welcome!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #28a745; margin: 0;">✅ Account Setup Complete!</h1>
                        </div>
                        
                        <div style="margin-bottom: 25px;">
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Hi <strong>${employeeData.first_name} ${employeeData.last_name}</strong>,
                            </p>
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Great news! Your account has been successfully set up and you're now ready to access our employee portal.
                            </p>
                        </div>
                        
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 6px; margin: 25px 0;">
                            <h3 style="color: #155724; margin: 0 0 10px 0;">Your Account Details:</h3>
                            <ul style="color: #155724; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                <li><strong>Position:</strong> ${employeeData.job_title}</li>
                                <li><strong>Department:</strong> ${employeeData.department}</li>
                                <li><strong>Start Date:</strong> ${employeeData.date_of_joining}</li>
                                <li><strong>Work Location:</strong> ${employeeData.work_location}</li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Welcome to the team! We're excited to have you on board.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Welcome email sent successfully');
        return {
            success: true,
            messageId: info.messageId
        };
        
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendInviteEmail,
    sendWelcomeEmail,
    sendInvitationAcceptanceEmail
}; 