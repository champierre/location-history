// ファイルアップロードの処理
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

// ファイル選択時の処理
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                uploadStatus.textContent = `${file.name} を読み込み中...`;
                processLocationHistory(jsonData);
                uploadStatus.textContent = `${file.name} の処理が完了しました`;
            } catch (error) {
                uploadStatus.textContent = 'ファイルの読み込みに失敗しました';
                console.error('JSONパースエラー:', error);
            }
        };
        
        reader.onerror = () => {
            uploadStatus.textContent = 'ファイルの読み込みに失敗しました';
        };
        
        reader.readAsText(file);
    } else {
        uploadStatus.textContent = '無効なファイル形式です。JSONファイルを選択してください';
    }
});

// ドラッグ＆ドロップの処理
const uploadSection = document.querySelector('.upload-section');

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.style.backgroundColor = '#f0f0f0';
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.style.backgroundColor = 'transparent';
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.style.backgroundColor = 'transparent';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    } else {
        uploadStatus.textContent = '無効なファイル形式です。JSONファイルをドロップしてください';
    }
});

function processLocationHistory(data) {
    // 青山キャンパスの座標（中心点）
    const AOYAMA_LAT = 35.6615;
    const AOYAMA_LNG = 139.7087;
    // 許容範囲（約200メートル）
    const THRESHOLD = 0.002;

    // 訪問日を格納するオブジェクト（月ごと）
    const visitDates = {};

    data.forEach(timeline => {
        const startTime = new Date(timeline.startTime);
        const month = `${startTime.getFullYear()}年${startTime.getMonth() + 1}月`;
        
        // その日がまだ記録されていない場合のみチェック
        const dateStr = startTime.toLocaleDateString('ja-JP');
        
        // タイムラインの各ポイントをチェック（timelinePathが存在する場合のみ）
        const isNearCampus = timeline.timelinePath && timeline.timelinePath.some(point => {
            const [lat, lng] = point.point.replace('geo:', '').split(',').map(Number);
            return Math.abs(lat - AOYAMA_LAT) < THRESHOLD && 
                   Math.abs(lng - AOYAMA_LNG) < THRESHOLD;
        });

        if (isNearCampus) {
            if (!visitDates[month]) {
                visitDates[month] = new Set();
            }
            visitDates[month].add(dateStr);
        }
    });

    displayResults(visitDates);
}

function displayResults(visitDates) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    // 月を降順にソート
    const months = Object.keys(visitDates).sort((a, b) => {
        const [yearA, monthA] = a.split('年').map(part => parseInt(part));
        const [yearB, monthB] = b.split('年').map(part => parseInt(part));
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
    });

    if (months.length === 0) {
        resultDiv.innerHTML = '<p>指定された期間内に青山キャンパスへの訪問記録はありませんでした。</p>';
        return;
    }

    months.forEach(month => {
        const monthSection = document.createElement('div');
        monthSection.className = 'month-section';

        const monthTitle = document.createElement('div');
        monthTitle.className = 'month-title';
        monthTitle.textContent = month;

        const dateList = document.createElement('ul');
        dateList.className = 'visit-list';

        // 日付を昇順にソート
        const sortedDates = Array.from(visitDates[month]).sort((a, b) => {
            const dateA = new Date(a.replace(/年|月|日/g, '/'));
            const dateB = new Date(b.replace(/年|月|日/g, '/'));
            return dateA - dateB;
        });

        sortedDates.forEach(date => {
            const listItem = document.createElement('li');
            // 日付文字列からDateオブジェクトを作成
            const dateObj = new Date(date.replace(/年|月|日/g, '/'));
            // 曜日を取得
            const dayOfWeek = dateObj.toLocaleDateString('ja-JP', { weekday: 'short' });
            // 元の日付に曜日を追加
            listItem.textContent = `${date}（${dayOfWeek}）`;
            dateList.appendChild(listItem);
        });

        monthSection.appendChild(monthTitle);
        monthSection.appendChild(dateList);
        resultDiv.appendChild(monthSection);
    });
}
