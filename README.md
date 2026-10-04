This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Firestore data isolation

Enterprise projects, sales, and financial ledger entries are owned by the authenticated Firebase UID in `userId`. Balance documents use `<uid>_VES` and `<uid>_USD`; Firestore listeners filter records by `userId`, and `firestore.rules` enforces ownership on reads and writes. Deploy the rules with `firebase deploy --only firestore:rules` before releasing the client changes.

Existing documents without `userId` remain inaccessible under the ownership rules. Assign them to verified owners through a trusted migration before expecting them to appear; do not infer ownership from email or assign shared records to an arbitrary account.

## Excel reports

The sales history and financial ledger exports are real `.xlsx` workbooks generated in the browser with SheetJS. The history report exports the active sales filters; the finance report exports the selected category filter.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
