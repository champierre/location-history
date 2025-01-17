document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            processLocationHistory(data);
        };
        reader.readAsText(file);
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
        
        // タイムラインの各ポイントをチェック
        const isNearCampus = timeline.timelinePath.some(point => {
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
            listItem.textContent = date;
            dateList.appendChild(listItem);
        });

        monthSection.appendChild(monthTitle);
        monthSection.appendChild(dateList);
        resultDiv.appendChild(monthSection);
    });
}
