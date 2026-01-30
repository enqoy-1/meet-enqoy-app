import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });
    console.log(JSON.stringify(rwanda, null, 2));
}
main();
