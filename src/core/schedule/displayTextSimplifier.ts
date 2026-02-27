const CAMPUS_PREFIXES = ['大学城校区 ', '五山校区 ', '广州国际校区 '] as const

export function simplifyRoomText(room: string) {
  const trimmedRoom = room.trim()

  for (const prefix of CAMPUS_PREFIXES) {
    if (!trimmedRoom.startsWith(prefix)) {
      continue
    }

    return trimmedRoom.slice(prefix.length).trimStart()
  }

  return trimmedRoom
}

export function simplifyCourseName(name: string) {
  return name
}

export function simplifyTeacherText(teacher: string) {
  return teacher.trim()
}
