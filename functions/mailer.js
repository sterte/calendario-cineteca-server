const nodemailer = require('nodemailer');
const config = require('./config');

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
        user: config.email.user,
        pass: config.email.pass
    }
});

exports.sendPasswordReset = async (to, token) => {
    const resetUrl = `${config.resetPasswordBaseUrl}?token=${token}`;
    await transporter.sendMail({
        from: config.email.from,
        to,
        subject: 'Cinetecalendar - Reset password',
        text: `Hai richiesto il reset della password.\n\nClicca qui per procedere:\n${resetUrl}\n\nIl link scade tra 1 ora.\n\nSe non hai richiesto il reset, ignora questa email.`,
        html: `
            <p>Hai richiesto il reset della password per il tuo account Cinetecalendar.</p>
            <p><a href="${resetUrl}" style="background:#f99e00;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Reimposta la password</a></p>
            <p>Il link scade tra <strong>1 ora</strong>.</p>
            <p>Se non hai richiesto il reset, ignora questa email.</p>
        `
    });
};
