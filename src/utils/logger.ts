export class Logger {
    private static logs: string[] = [];

    static log(message: string) {
        const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.logs.push(entry);
        return entry;
    }

    static getLogs() {
        return this.logs;
    }
}