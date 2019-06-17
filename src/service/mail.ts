import * as nodemailer from 'nodemailer'
import config from '../config'

export default class MailService {

  public static send(to: string, subject: string, html: string) {

    nodemailer.createTestAccount((_err, _account) => {
      const transporter = nodemailer.createTransport(config.mail)

      // setup email data with unicode symbols
      const mailOptions = {
        from: `"RAP2 Notifier" <${config.mailSender}>`, // sender address
        to,
        subject,
        html,
      }

      // send mail with defined transport object
      transporter.sendMail(mailOptions)
    })

  }

}