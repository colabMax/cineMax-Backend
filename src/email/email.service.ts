import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.APIKEY_RESEND);
  }

  async sendVerificationEmail(email: string, code: string) {
    return await this.resend.emails.send({
      from: 'CineMax <onboarding@resend.dev>',
      to: email,
      subject: 'Verificación de correo',
      html: `
<h1>Verifica tu cuenta en CineMax</h1>

<p>¡Bienvenido!</p>

<p>Utiliza el siguiente código para verificar tu dirección de correo electrónico:</p>

<h2 style="letter-spacing: 4px;">${code}</h2>

<p>⏳ Este código es válido durante <strong>10 minutos</strong>.</p>

<hr>

<p>
Si el código expiró, vuelve a la aplicación y selecciona
<strong>"Reenviar código de verificación"</strong> para recibir uno nuevo.
</p>

<p>
Si no creaste una cuenta en CineMax, puedes ignorar este correo de forma segura.
</p>
      `,
    });
  }
}
