export interface DynamicMessage {
  greeting: string
  subtitle: string
}

export function getDynamicDashboardMessage(userName: string): DynamicMessage {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()
  const firstName = userName.split(' ')[0]

  const messages: DynamicMessage[] = []

  // Monday messages
  if (dayOfWeek === 1) {
    messages.push(
      { greeting: `Happy Monday, ${firstName}!`, subtitle: 'Fresh week, fresh IEPs—let\'s make it count' },
      { greeting: `Monday mode activated, ${firstName}`, subtitle: 'Time to tackle those referrals with fresh energy' },
      { greeting: `Welcome to Monday, ${firstName}`, subtitle: 'New week, new opportunities to support students' }
    )
  }

  // Tuesday messages
  if (dayOfWeek === 2) {
    messages.push(
      { greeting: `Happy Tuesday, ${firstName}`, subtitle: 'You\'re already crushing this week' },
      { greeting: `Tuesday vibes, ${firstName}`, subtitle: 'Halfway to hump day—keep the momentum going' },
      { greeting: `Good morning, ${firstName}`, subtitle: 'Another day, another chance to make a difference' }
    )
  }

  // Wednesday messages
  if (dayOfWeek === 3) {
    messages.push(
      { greeting: `Happy Hump Day, ${firstName}!`, subtitle: 'You\'re over the hill—coast into the weekend' },
      { greeting: `Wednesday wins, ${firstName}`, subtitle: 'Midweek check-in: you\'re doing great' },
      { greeting: `Halfway there, ${firstName}`, subtitle: 'Keep up the excellent work supporting our students' }
    )
  }

  // Thursday messages
  if (dayOfWeek === 4) {
    messages.push(
      { greeting: `Thursday thoughts, ${firstName}`, subtitle: 'Almost Friday—finish strong this week' },
      { greeting: `Happy Thursday, ${firstName}`, subtitle: 'The weekend is in sight, but there\'s still work to do' },
      { greeting: `Good morning, ${firstName}`, subtitle: 'One more day until Friday—let\'s make it count' }
    )
  }

  // Friday messages
  if (dayOfWeek === 5) {
    messages.push(
      { greeting: `TGIF, ${firstName}!`, subtitle: 'Wrap up those referrals and enjoy the weekend' },
      { greeting: `Happy Friday, ${firstName}`, subtitle: 'Finish strong—the weekend awaits' },
      { greeting: `Friday feeling, ${firstName}`, subtitle: 'Close out the week with purpose and pride' }
    )
  }

  // Weekend messages
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    messages.push(
      { greeting: `Weekend warrior, ${firstName}`, subtitle: 'Thanks for being here when it matters most' },
      { greeting: `Happy weekend, ${firstName}`, subtitle: 'Going above and beyond for our students' },
      { greeting: `Weekend dedication, ${firstName}`, subtitle: 'Your commitment doesn\'t go unnoticed' }
    )
  }

  // Time-of-day variations
  if (hour < 12) {
    messages.push(
      { greeting: `Good morning, ${firstName}`, subtitle: 'Ready to support students and families today?' },
      { greeting: `Morning, ${firstName}`, subtitle: 'Coffee up—there are students counting on you' },
      { greeting: `Rise and shine, ${firstName}`, subtitle: 'Another day to make an impact in SPED' }
    )
  } else if (hour < 17) {
    messages.push(
      { greeting: `Good afternoon, ${firstName}`, subtitle: 'Keep that momentum going strong' },
      { greeting: `Afternoon check-in, ${firstName}`, subtitle: 'You\'re making progress—keep it up' },
      { greeting: `Hey there, ${firstName}`, subtitle: 'Hope your day is going smoothly' }
    )
  } else {
    messages.push(
      { greeting: `Good evening, ${firstName}`, subtitle: 'Burning the midnight oil? We appreciate you' },
      { greeting: `Evening, ${firstName}`, subtitle: 'Late hours, big impact—thank you' },
      { greeting: `Still here, ${firstName}?`, subtitle: 'Your dedication to students is inspiring' }
    )
  }

  // General encouraging messages (always available)
  messages.push(
    { greeting: `Welcome back, ${firstName}`, subtitle: 'Every referral you process changes a life' },
    { greeting: `Hey ${firstName}`, subtitle: 'Supporting students, one placement at a time' },
    { greeting: `Good to see you, ${firstName}`, subtitle: 'Your work matters more than you know' },
    { greeting: `Hello ${firstName}`, subtitle: 'Making SPED services accessible for all' },
    { greeting: `Welcome, ${firstName}`, subtitle: 'Champions for students with special needs' },
    { greeting: `Hi ${firstName}`, subtitle: 'Coordinating care, creating opportunities' },
    { greeting: `Back at it, ${firstName}`, subtitle: 'Building bridges to better education' }
  )

  // Pick a random message from the pool
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}
