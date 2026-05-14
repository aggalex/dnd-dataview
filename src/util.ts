export const StringUtil = {
    compare(a: string, b: string) {
        if (a === b) {
            return 0
        } else if (a > b) {
            return 1
        } else {
            return -1
        }
    }
}