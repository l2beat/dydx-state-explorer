import { getStateTransitionFacts } from './fetchData'

export function decode(value: string) {
  return parseInt(value)
}

getStateTransitionFacts(
  '0x46c212912be05a090a9300cf87fd9434b8e8bbca15878d070ba83375a5dbaebd'
)
