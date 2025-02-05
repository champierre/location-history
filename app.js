// ローカルストレージから座標と許容範囲を読み込む
const coordinatesInput = document.getElementById('coordinates');
const thresholdInput = document.getElementById('threshold');

// 最後に読み込んだJSONデータを保持する変数
let lastLoadedData = null;

// 座標文字列をパースする関数
function parseCoordinates(input) {
    // 入力文字列から不要な空白を削除
    const cleanInput = input.trim();
    
    // (緯度, 経度) 形式のパース
    const parenthesesMatch = cleanInput.match(/^\(([\d.-]+),\s*([\d.-]+)\)$/);
    if (parenthesesMatch) {
        return {
            lat: parseFloat(parenthesesMatch[1]),
            lng: parseFloat(parenthesesMatch[2])
        };
    }
    
    // 緯度,経度 形式のパース
    const simpleMatch = cleanInput.match(/^([\d.-]+),\s*([\d.-]+)$/);
    if (simpleMatch) {
        return {
            lat: parseFloat(simpleMatch[1]),
            lng: parseFloat(simpleMatch[2])
        };
    }
    
    return null;
}

// 保存された値があれば入力欄に設定
const savedLocation = JSON.parse(localStorage.getItem('location') || '{}');
if (savedLocation.lat && savedLocation.lng) {
    coordinatesInput.value = `(${savedLocation.lat}, ${savedLocation.lng})`;
}

// 保存された許容範囲があれば設定
const savedThreshold = localStorage.getItem('threshold');
if (savedThreshold) {
    thresholdInput.value = savedThreshold;
}

// メートル単位の距離を緯度経度の差分に変換する関数
function metersToCoordDiff(meters) {
    // 緯度1度は約111km、経度1度は約91km（日本付近）として計算
    return meters / 91000; // より大きい値（経度）を使用して安全側に
}

// 入力値の自動保存とマップリンクの更新
function updateLocation() {
    const coordinates = parseCoordinates(coordinatesInput.value);
    const mapsLinkElement = document.getElementById('maps-link');
    
    if (coordinates) {
        // ローカルストレージに保存
        localStorage.setItem('location', JSON.stringify(coordinates));
        
        // Google Mapsリンクを更新
        const mapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
        mapsLinkElement.innerHTML = 
        `<a href="${mapsUrl}" target="_blank">Google Mapsで表示 📍</a>`;        
    } else {
        mapsLinkElement.innerHTML = '';
    }
}

// 入力値が変更された時の共通処理
function handleInputChange() {
    updateLocation();
    if (lastLoadedData) {
        processLocationHistory(lastLoadedData);
    }
}

coordinatesInput.addEventListener('input', handleInputChange);
thresholdInput.addEventListener('input', () => {
    // 許容範囲の値をローカルストレージに保存
    localStorage.setItem('threshold', thresholdInput.value);
    if (lastLoadedData) {
        processLocationHistory(lastLoadedData);
    }
});

// 初期表示時にもマップリンクを更新
updateLocation();

// ファイルアップロードの処理
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

// 共通のファイル処理関数
function handleFile(file) {
    // 座標のバリデーション
    const coordinates = parseCoordinates(coordinatesInput.value);
    
    if (!coordinates) {
        uploadStatus.textContent = '⚠️ エラー: 有効な座標を入力してください';
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
                lastLoadedData = jsonData;
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
    const coordinates = parseCoordinates(coordinatesInput.value);
    
    if (!coordinates) {
        uploadStatus.textContent = '⚠️ エラー: 有効な座標を入力してください';
        uploadStatus.style.color = 'red';
        return;
    }
    
    // 許容範囲をメートルから緯度経度の差分に変換
    const THRESHOLD = metersToCoordDiff(parseFloat(thresholdInput.value));

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
            return Math.abs(pointLat - coordinates.lat) < THRESHOLD && 
                   Math.abs(pointLng - coordinates.lng) < THRESHOLD;
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
