import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID || process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'your_document_template_id';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key';

emailjs.init(EMAILJS_PUBLIC_KEY);

export const sendDocumentApprovalEmail = async (studentEmail, studentName, documentType, requestDate) => {
  try {
    if (!process.env.REACT_APP_EMAILJS_SERVICE_ID || !process.env.REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID || !process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS environment variables are not properly configured');
    }

    // Minimal variables for testing
    const templateParams = {
      email: studentEmail,
      to_name: studentName,
      document_type: documentType
    };

    console.log('📧 Attempting to send document approval email with EmailJS...');
    console.log('Service ID:', EMAILJS_SERVICE_ID);
    console.log('Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('Template Params:', templateParams);
    console.log('🔍 Using template ID:', process.env.REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID || process.env.REACT_APP_EMAILJS_TEMPLATE_ID);
    console.log('🔍 Environment check:');
    console.log('- REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID:', process.env.REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID);
    console.log('- REACT_APP_EMAILJS_TEMPLATE_ID:', process.env.REACT_APP_EMAILJS_TEMPLATE_ID);
    console.log('- Final template ID being used:', EMAILJS_TEMPLATE_ID);
    
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return { success: true, message: 'Document approval email sent successfully' };
  } catch (error) {
    console.error('Error sending document approval email:', error);
    return { success: false, message: 'Failed to send document approval email', error: error.message };
  }
};

export const sendDocumentRejectionEmail = async (studentEmail, studentName, documentType, requestDate, reason = '') => {
  try {
    console.log('=== DOCUMENT REJECTION EMAIL DEBUG INFO ===');
    console.log('Student Email:', studentEmail);
    console.log('Student Name:', studentName);
    console.log('Document Type:', documentType);
    console.log('Reason:', reason);
    console.log('==========================================');
    
    if (!process.env.REACT_APP_EMAILJS_SERVICE_ID || !process.env.REACT_APP_EMAILJS_DOCUMENT_TEMPLATE_ID || !process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      console.error('❌ EmailJS environment variables missing!');
      throw new Error('EmailJS environment variables are not properly configured');
    }

    // Minimal variables for testing
    const templateParams = {
      email: studentEmail,
      to_name: studentName,
      document_type: documentType
    };

    console.log('📧 Attempting to send document rejection email with EmailJS...');
    
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return { success: true, message: 'Document rejection email sent successfully' };
  } catch (error) {
    console.error('Error sending document rejection email:', error);
    return { success: false, message: 'Failed to send document rejection email', error: error.message };
  }
};
