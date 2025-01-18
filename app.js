// ローカルストレージから座標を読み込む
const latInput = document.getElementById('latitude');
const lngInput = document.getElementById('longitude');

// 保存された座標があれば入力欄に設定
const savedLocation = JSON.parse(localStorage.getItem('location') || '{}');
if (savedLocation.lat && savedLocation.lng) {
    latInput.value = savedLocation.lat;
    lngInput.value = savedLocation.lng;
}

// 座標入力時の自動保存
function saveLocation() {
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    if (!isNaN(lat) && !isNaN(lng)) {
        localStorage.setItem('location', JSON.stringify({
            lat,
            lng
        }));
        updateMapsLink(lat, lng);
    }
}

function updateMapsLink(lat, lng) {
    const mapsLink = document.getElementById('maps-link');
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    mapsLink.innerHTML = `<a href="${url}" target="_blank">Google Mapsで表示 📍</a>`;
}

// 初期表示時にもGoogle Mapsリンクを更新
if (savedLocation.lat && savedLocation.lng) {
    updateMapsLink(savedLocation.lat, savedLocation.lng);
}

latInput.addEventListener('input', saveLocation);
lngInput.addEventListener('input', saveLocation);

// ファイルアップロードの処理
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

// 共通のファイル処理関数
function handleFile(file) {
    // 緯度経度のバリデーション
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    if (isNaN(lat) || isNaN(lng)) {
        uploadStatus.textContent = '⚠️ エラー: 有効な緯度と経度を入力してください';
        uploadStatus.style.color = 'red';
        return;
    }

    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                uploadStatus.textContent = `${file.name} を読み込み中...`;
                uploadStatus.style.color = 'initial';
                processLocationHistory(jsonData);
                uploadStatus.textContent = `${file.name} の処理が完了しました`;
            } catch (error) {
                uploadStatus.textContent = '⚠️ エラー: ファイルの読み込みに失敗しました';
                uploadStatus.style.color = 'red';
                console.error('JSONパースエラー:', error);
            }
        };
        
        reader.onerror = () => {
            uploadStatus.textContent = '⚠️ エラー: ファイルの読み込みに失敗しました';
            uploadStatus.style.color = 'red';
        };
        
        reader.readAsText(file);
    } else {
        uploadStatus.textContent = '⚠️ エラー: 無効なファイル形式です。JSONファイルを選択してください';
        uploadStatus.style.color = 'red';
    }
}

// ファイル選択時の処理
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    handleFile(file);
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
    handleFile(file);
});

function processLocationHistory(data) {
    // ユーザー入力の座標を取得
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    if (isNaN(lat) || isNaN(lng)) {
        uploadStatus.textContent = '⚠️ エラー: 有効な緯度と経度を入力してください';
        uploadStatus.style.color = 'red';
        return;
    }
    
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
        const isNear = timeline.timelinePath && timeline.timelinePath.some(point => {
            const [pointLat, pointLng] = point.point.replace('geo:', '').split(',').map(Number);
            return Math.abs(pointLat - lat) < THRESHOLD && 
                   Math.abs(pointLng - lng) < THRESHOLD;
        });

        if (isNear) {
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
        resultDiv.innerHTML = '<p>指定された期間内に指定位置への訪問記録はありませんでした。</p>';
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
