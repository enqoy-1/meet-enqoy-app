const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(u => p.event.count().then(e => { console.log('Users:', u, 'Events:', e); p.\(); }));
