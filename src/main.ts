import { Plugin, Notice, TFile } from 'obsidian';
import {DEFAULT_SETTINGS, YandexDiskSettings} from "./mod";
import {YandexDiskSettingTab} from "./settings";
import {YandexDiskClient} from "./yandex_client"


export default class YandexDiskSyncPlugin extends Plugin {
	settings: YandexDiskSettings;
	private readonly folderCache = new Set<string>();

	async onload() {
		await this.loadSettings();

		// Иконка в боковой панели
		this.addRibbonIcon('cloud', 'Sync all to yandex disk', () => this.syncAllFiles());
		this.addSettingTab(new YandexDiskSettingTab(this.app, this));
	}

    async syncAllFiles() {
		// Проверка токена
		if (!this.settings.oauthToken) {
			new Notice('Ошибка: введите auth токен в настройках!');
			return;
		}

		// Создаем клиент для работы с API
		const client = new YandexDiskClient(this.settings.oauthToken);

		new Notice('Запуск синхронизации...');

		try {
            new Notice('Анализ файлов...');
			// Список файлов которые есть на яндекс диске
			// Нужно для обновления списка фойлов
            const remoteFiles = await client.getRemoteFiles(this.settings.remotePath);

			// Список файлов для загрузки
            const tasks = this.prepareTasks(remoteFiles);
			const total = tasks.length;

			// Если файлов нет то значит все актуально
            if (total === 0) {
                new Notice('Все файлы актуальны.');
                return;
            }

			// Запуск синхронизации файлов
            // Устанавливаем длительность 0, чтобы он не исчез раньше времени автоматически.
        	const progressNotice = new Notice(`Подготовка к загрузке 0/${total}...`, 0);

			// Параллельная загрузка файлов
            const uploaded = await this.runUploadPool(tasks, client, progressNotice, 5, total);
            // После завершения скрываем или меняем сообщение и даем ему закрыться через 5 сек
        	progressNotice.setMessage(`✅ Готово! Загружено: ${uploaded}`);
        	setTimeout(() => progressNotice.hide(), 5000)

			// Очистка кэша
            this.folderCache.clear();
        } catch (error) {
            console.error(error);
            new Notice('Ошибка при синхронизации.');
        }
	}

	// Определяем файлы необходиммые для загрузки
	private prepareTasks(remoteFiles: Map<string, string>): TFile[] {
        const localFiles = this.app.vault.getFiles()
            .filter(f => !f.path.startsWith('.obsidian/'));
        return localFiles.filter(file => {
            const remoteModified = remoteFiles.get(file.path);
            if (!remoteModified) return true; // Провека файла на наличие на диске
            return file.stat.mtime > (new Date(remoteModified).getTime() + 2000);
        });
    }

	private async runUploadPool(tasks: TFile[], client: YandexDiskClient, progressNotice: Notice ,concurrency: number, total: number): Promise<number> {
        let count = 0;
		let finished = 0;
        const worker = async () => {
            while (tasks.length > 0) {
                const file = tasks.shift(); // Берем каждый файл по очереди
                if (!file) break;

				try {
					await this.ensureRemoteFolderExists(file.path, client);
					const content = await this.app.vault.readBinary(file);
					const targetPath = `${this.settings.remotePath}/${file.path}`;

					if (await client.uploadFile(targetPath, content)) {
						count++;
					}
				}
				catch (error) {
					new Notification(`Ошибка при загрузке файла ${file.path}: ${error}`);
				}
				finally {
                finished++;
                // Обновляем текст в уведомлении
                const percent = Math.round((finished / total) * 100);
                progressNotice.setMessage(`Загрузка: ${finished}/${total} (${percent}%) \n${file.name}`);
				}
            }
        };

		// Запускаем 5 воркеров параллельно
        await Promise.all(new Array(concurrency).fill(null).map(() => worker()));
        return count;
    }

	private async ensureRemoteFolderExists(filePath: string, client: YandexDiskClient) {
		const parts = filePath.split('/');
		parts.pop(); // Убираем имя файла, оставляем только путь

		let currentPath = this.settings.remotePath;

		for (const part of parts) {
			currentPath += '/' + part;
			if (!this.folderCache.has(currentPath)) {
				await client.createFolder(currentPath);
				this.folderCache.add(currentPath);
			}
		}
	}

	async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }

}
