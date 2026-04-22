
'use server';

import { google as googleapis } from 'googleapis';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Reusable function to get an authenticated Drive client
const getDriveClient = (accessToken: string) => {
  const auth = new (googleapis.auth.OAuth2)();
  auth.setCredentials({ access_token: accessToken });
  return googleapis.drive({ version: 'v3', auth });
};

// Reusable function to find the app's folder ID
const getAppFolderId = async (drive: ReturnType<typeof getDriveClient>): Promise<string> => {
    const FOLDER_NAME = "Bewerbungsunterlagen AI";
    try {
        const response = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id!;
        } else {
           const folderMetadata = {
                name: FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            };
            const file = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });
            return file.data.id!;
        }
    } catch (error) {
        console.error("Error finding or creating app folder in Drive:", error);
        throw new Error("Konnte den App-Ordner in Google Drive nicht finden oder erstellen.");
    }
};


export async function listDriveFiles(accessToken: string): Promise<{ id: string; name: string }[]> {
    if (!accessToken) {
        return [];
    }

    try {
        const drive = getDriveClient(accessToken);
        const folderId = await getAppFolderId(drive);
        
        if (!folderId) {
            return []; // Folder doesn't exist, so no files to list.
        }

        const response = await drive.files.list({
            q: `'${folderId}' in parents and (mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='image/jpeg' or mimeType='image/png' or mimeType='text/plain') and trashed=false`,
            fields: 'files(id, name)',
            orderBy: 'createdTime desc',
            pageSize: 100,
        });

        return response.data.files as { id: string; name: string }[] || [];
    } catch (error) {
        console.error('Error listing Drive files:', error);
        throw new Error('Fehler beim Auflisten der Drive-Dateien.');
    }
}


export async function extractTextFromDriveFile(fileId: string, accessToken: string): Promise<string> {
    if (!fileId || !accessToken) {
        throw new Error('Datei-ID und Zugriffstoken sind erforderlich.');
    }

    try {
        const drive = getDriveClient(accessToken);
        
        const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType, name',
        });
        const mimeType = fileMetadata.data.mimeType;

        if (!mimeType) {
            throw new Error('Dateityp konnte nicht ermittelt werden.');
        }

        // Handle Google Docs by exporting them as plain text
        if (mimeType.includes('google-apps.document')) {
             const response = await drive.files.export({ fileId: fileId, mimeType: 'text/plain' }, { responseType: 'text' });
             return response.data as string;
        }

        // Handle binary files (PDF, DOCX) by downloading and parsing on the server
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        
        const responseData = response.data;
        let fileBuffer: Buffer;

        if (typeof responseData === 'object' && responseData !== null && !(responseData instanceof ArrayBuffer)) {
            fileBuffer = Buffer.from(JSON.stringify(responseData));
        } else {
            fileBuffer = Buffer.from(responseData as ArrayBuffer);
        }

        if (mimeType === 'application/pdf') {
            const data = await pdf(fileBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
             // Correctly handle the promise returned by mammoth
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value;
        } else if (mimeType === 'text/plain') {
            return fileBuffer.toString('utf-8');
        } else {
            console.warn(`Unsupported MIME type for text extraction: ${mimeType}`);
            return `Inhalt der Datei "${fileMetadata.data.name}" (Typ: ${mimeType}) konnte nicht als Text extrahiert werden.`;
        }

    } catch (error) {
        console.error('Error extracting text from Drive file:', error);
        const gError = error as any;
        if (gError.errors && gError.errors[0]) {
             throw new Error(`Google API Fehler: ${gError.errors[0].message}`);
        }
        throw new Error('Fehler beim Extrahieren des Textes aus der Datei. Der Dateityp wird möglicherweise nicht unterstützt.');
    }
}

const findFileIdByName = async (drive: ReturnType<typeof getDriveClient>, folderId: string, fileName: string): Promise<string | null> => {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
    });
    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
    }
    return null;
}

export async function saveFileToDrive(accessToken: string, fileName: string, content: string, mimeType: string): Promise<void> {
    if (!accessToken) throw new Error("Access token is required.");
    const drive = getDriveClient(accessToken);
    const folderId = await getAppFolderId(drive);
    if (!folderId) throw new Error("App folder not found in Google Drive.");

    const fileId = await findFileIdByName(drive, folderId, fileName);

    const fileMetadata = { name: fileName, mimeType };
    const media = { mimeType, body: content };

    if (fileId) {
        await drive.files.update({
            fileId,
            media,
            requestBody: fileMetadata
        });
    } else {
        await drive.files.create({
            resource: { ...fileMetadata, parents: [folderId] },
            media: media,
            fields: 'id',
        });
    }
}

export async function getFileContentFromDrive(accessToken: string, fileName: string): Promise<string | null> {
    if (!accessToken) return null;
    try {
        const drive = getDriveClient(accessToken);
        const folderId = await getAppFolderId(drive);
        if (!folderId) return null;

        const fileId = await findFileIdByName(drive, folderId, fileName);
        if (!fileId) return null;

        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'text' }
        );
        return response.data as string;
    } catch (error) {
        console.error(`Error getting file ${fileName} from Drive:`, error);
        return null;
    }
}
