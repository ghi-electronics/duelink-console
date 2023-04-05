export default class WebUSB {
    constructor() {
        this.outEndpoint = 1;
        this.inEndpoint = 2;
        this.device = undefined;
        this.errorLog = [];
    }

    async connect() {
        await navigator.usb.requestDevice({ filters: [{ vendorId: 0x1B9F }] }).then(async (device) => {
            this.device = device;
            await this.device.open().then(async () => {
                await this.device.selectConfiguration(1);
                await this.device.claimInterface(0);
            });
        }).catch((error) => {
            this.errorLog.push(error);
            console.log('error', error, 'device is undefined');
            this.device = undefined;
        });
    }

    async sendCommand(command) {
        await this.device.transferOut(this.outEndpoint, command.toProtocol());
    }

    async readBytes(count) {
        let buffer = new Uint8Array(count);
        let offset = 0;
        while (count > 0) {
            let result = await this.device.transferIn(this.inEndpoint, count);
            if (result.data) {
                buffer.set(new Uint8Array(result.data.buffer), offset);
                offset += result.data.byteLength;
                count -= result.data.byteLength;
            }
            if (result.status === 'stall') {
                await this.device.clearHalt(2);
            }
        }
        return buffer;
    }
}
