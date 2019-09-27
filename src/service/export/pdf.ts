// import MarkdownService from './markdown'
// import markdownpdf = require('markdown-pdf')
// // import { Readable, Stream } from 'stream'

// export default class PDFService {
//   public static async export(
//     repositoryId: number,
//     origin: string
//   ): Promise<Buffer> {
//     const markdown = await MarkdownService.export(repositoryId, origin)
//     return new Promise((resolve, reject) => {
//       markdownpdf()
//         .from.string(markdown)
//         // @ts-ignore
//         .to.buffer(undefined, (err, data) => {
//           if (err) {
//             reject(err)
//             return
//           }
//           resolve(data)
//         })
//     })
//   }
// }
