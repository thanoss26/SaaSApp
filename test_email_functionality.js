const { sendInviteEmail } = require('./utils/emailService');

async function testEmailFunctionality() {
    try {
        console.log('🧪 Testing email functionality...');
        
        const testEmployee = {
            first_name: 'Test',
            last_name: 'Employee',
            email: 'test.employee@company.com',
            job_title: 'Software Engineer',
            department: 'Engineering'
        };
        
        const testInviteCode = '123456';
        
        console.log('📧 Sending test invite email...');
        const result = await sendInviteEmail(testEmployee, testInviteCode);
        
        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log('📧 Message ID:', result.messageId);
            if (result.previewUrl) {
                console.log('📧 Preview URL:', result.previewUrl);
            }
        } else {
            console.error('❌ Email failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testEmailFunctionality(); 