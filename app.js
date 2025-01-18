// サンプルデータを直接埋め込み
const sampleData = [
  {
    "endTime" : "2014-10-17T09:27:40.285+09:00",
    "startTime" : "2014-10-17T09:07:02.473+09:00",
    "activity" : {
      "end" : "geo:35.662978,139.745069",
      "topCandidate" : {
        "type" : "in subway",
        "probability" : "0.000000"
      },
      "distanceMeters" : "4820.874023",
      "start" : "geo:35.691348,139.704710"
    }
  },
  {
    "endTime" : "2014-10-17T11:44:51.053+09:00",
    "startTime" : "2014-10-17T09:27:40.285+09:00",
    "visit" : {
      "hierarchyLevel" : "0",
      "topCandidate" : {
        "probability" : "0.983039",
        "semanticType" : "Work",
        "placeID" : "ChIJn7Ze2ZaLGGAR_KuObJMuT6s",
        "placeLocation" : "geo:35.662978,139.745069"
      },
      "probability" : "0.640000"
    }
  },
  {
    "endTime" : "2025-01-14T06:00:00.000Z",
    "startTime" : "2025-01-14T04:00:00.000Z",
    "timelinePath" : [
      {
        "point" : "geo:35.660638,139.711885",
        "durationMinutesOffsetFromStartTime" : "55"
      }
    ]
  }
];

// ページ読み込み時に結果を表示
window.addEventListener('load', () => {
    processLocationHistory(sampleData);
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
