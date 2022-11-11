import { Observable } from 'rxjs';

export function calculate(fsym: string): Observable<number> {
  return new Observable(observer => {
    let url: string = 'https://min-api.cryptocompare.com/data/v2/histominute';
    url += '?fsym=' + fsym;
    url += '&tsym=USD';
    url += '&limit=119';
    url += '&api_key=f4ac2f3f42fe5c8bcf3d8ad3e13fed0626122f118708584e27257683e8dd87c9';
    fetch(url)
      .then(response => {
        if (response.status === 200) {
          return response.json();
        }
      })
      .then(json => {
        if (!json) {
          throw new Error('Invalid crypto response');
        }
        if (json.Response === 'Error') {
          throw new Error(json.Message);
        }
        json.Data.Data.sort((a, b) => b.time - a.time);
        observer.next(json.Data.Data[0].close);
      })
      .catch(err => {
        console.error(err.message);
        observer.error();
      });
  });
}
