import nodemailer from 'nodemailer';
import { ServiceError } from './gemini.ts';

export type VerificationMail = {
  email: string;
  code: string;
  purpose: 'register' | 'reset';
};
export interface Mailer {
  configured: boolean;
  send(message: VerificationMail): Promise<void>;
}
export function smtpMailer(): Mailer {
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  return {
    configured,
    async send({ email, code, purpose }) {
      if (!configured) throw new ServiceError(503, 'Пошта қызметі әлі бапталмаған.');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        requireTLS: true,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject:
            purpose === 'register'
              ? 'EsseKZ: поштаңызды растаңыз'
              : 'EsseKZ: құпия сөзді қалпына келтіру',
          text: `Растау коды: ${code}\nКод 10 минут жарамды және бір рет қолданылады.\nЕгер сұрау жібермесеңіз, хатты елемеңіз. Кодты ешкімге бермеңіз.`,
        });
      } catch {
        throw new ServiceError(503, 'Пошта қызметі уақытша қолжетімсіз. Кейінірек қайталаңыз.');
      } finally {
        transport.close();
      }
    },
  };
}
