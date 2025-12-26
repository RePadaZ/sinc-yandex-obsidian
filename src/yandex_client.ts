import {Notice, requestUrl} from "obsidian";

export class YandexDiskClient {

    constructor(private readonly token: string) {}

    async getRemoteFiles(remotePath: string): Promise<Map<string, string>> {

        const remoteMap = new Map<string, string>();

        try {
            const response = await requestUrl({
                url: `https://cloud-api.yandex.net/v1/disk/resources/files?limit=1000`,
                method: 'GET',
                headers: { 'Authorization': `OAuth ${this.token}` }
            });

            if (response.status === 200) {
                for (const item of response.json.items) {
                    if (item.path.includes(remotePath)) {
                        const relativePath = item.path.split(`${remotePath}/`)[1];
                        remoteMap.set(relativePath, item.modified);
                    }
                }
            }
        } catch(e) {
			 new Notice(`${e}`)
        }

        return remoteMap;

    }

    async createFolder(path: string) {
        try {
            await requestUrl({
                url: `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}`,
                method: 'PUT',
                headers: { 'Authorization': `OAuth ${this.token}` }
            });
        } catch {
			/* Папка уже может существовать (409) */ }
    }

    async uploadFile(targetPath: string, content: ArrayBuffer): Promise<boolean> {
        const getUrl = await requestUrl({
            url: `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(targetPath)}&overwrite=true`,
            method: 'GET',
            headers: { 'Authorization': `OAuth ${this.token}` }
        });

        const result = await requestUrl({
            url: getUrl.json.href,
            method: 'PUT',
            body: content,
            headers: { 'Content-Type': 'application/octet-stream' }
        });

        return result.status === 201;
    }

}
