import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'admin@univ.local'   
  const password = 'Luc@Dev79' 
  const hash = await bcrypt.hash(password, 10)

  const admin = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hash,
      role: 'admin'
    }
  })

  console.log('✅ Compte administrateur prêt :', admin.email)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())