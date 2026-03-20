import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Upload file video ke Catbox.moe
 * @param {string} filePath - Path lokasi video yang mau diupload
 * @returns {string|null} - Link download video atau null jika gagal
 */
export async function uploadToCatbox(filePath) {
    console.log(`[UPLOADER] Preparing upload for: ${filePath}`);

    // Cek apakah file beneran ada sebelum diupload
    if (!fs.existsSync(filePath)) {
        console.error(`[UPLOADER_ERROR] File not found: ${filePath}`);
        return null;
    }

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    try {
        console.log(`[UPLOADER] Uploading to Catbox API...`);
        
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
            },
            // Timeout 5 menit karena video bisa jadi lumayan gede
            timeout: 300000 
        });

        if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
            console.log(`[UPLOADER] Upload Success! Link: ${response.data}`);
            return response.data;
        } else {
            console.error(`[UPLOADER_ERROR] Unexpected response: ${response.data}`);
            return null;
        }

    } catch (error) {
        console.error(`[UPLOADER_FATAL] ${error.message}`);
        if (error.code === 'ECONNABORTED') {
            console.error(`[UPLOADER_ERROR] Upload timeout. File mungkin terlalu besar atau internet lambat.`);
        }
        return null;
    }
}