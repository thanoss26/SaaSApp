const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter for email sending
const createTransporter = () => {
    // For development, use a mock transporter that simulates email sending
    if (process.env.NODE_ENV === 'development') {
        console.log('📧 Using mock email service for development');
        return {
            sendMail: async (mailOptions) => {
                // Simulate email sending delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Generate a mock message ID
                const messageId = `<mock-${Date.now()}@localhost>`;
                
                console.log('📧 Mock email sent to:', mailOptions.to);
                console.log('📧 Subject:', mailOptions.subject);
                
                return {
                    messageId,
                    response: 'Mock email sent successfully',
                    accepted: [mailOptions.to],
                    rejected: [],
                    pending: []
                };
            }
        };
    } else {
        // Production: Use Gmail SMTP
        console.log('📧 Using Gmail SMTP configuration');
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
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
        
        // For development, create a mock preview URL
        let previewUrl = null;
        if (process.env.NODE_ENV === 'development') {
            previewUrl = `http://localhost:3000/invite/${inviteCode}`;
            console.log('📧 Mock preview URL:', previewUrl);
        } else if (process.env.NODE_ENV !== 'production') {
            previewUrl = nodemailer.getTestMessageUrl(info);
        }
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl: previewUrl
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