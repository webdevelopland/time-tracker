import { Component } from '@angular/core';
import { Observable, zip, Subscription } from 'rxjs';

import { Track } from '@/core/interfaces';
import { FirebaseService } from '@/core/services';

interface Project {
  id: string;
  time: number;
  label: string;
  start: number;
  end: number;
  started: boolean;
  timer: number;
  display: number;
}

interface ProjectMap {
  [label: string]: Project;
}

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: ['./tracks.component.scss'],
})
export class TracksComponent {
  isLoading = true;
  tracks: Track[];
  projectMap: ProjectMap = {};

  constructor(private firebaseService: FirebaseService) {
    this.load();
  }

  load(): void {
    const sub: Subscription = this.firebaseService.getTracks().subscribe(tracks => {
      sub.unsubscribe();
      this.projectMap = {};
      this.tracks = tracks.filter(track => track.user === this.firebaseService.user);
      for (const track of this.tracks) {
        if (!this.projectMap[track.project]) {
          this.projectMap[track.project] = this.create();
          this.projectMap[track.project].label = track.project;
          this.projectMap[track.project].id = track.id;
        }
        const ms: number = track.end - track.start;
        this.projectMap[track.project].time += ms;
        this.projectMap[track.project].display = this.projectMap[track.project].time;
      }
      this.isLoading = false;
    });
  }

  getProjects(): Project[] {
    return Object.values(this.projectMap);
  }

  timeConversion(ms: number): string {
    function getZero(num: number): string {
      num = Math.floor(num);
      return ('0' + num).slice(-2);
    }

    const date: Date = new Date(ms);
    return Math.floor(date.getUTCHours()) + ':' +
      getZero(date.getMinutes()) + ':' +
      getZero(date.getSeconds());
  }

  start(label: string): void {
    for (const project of this.getProjects()) {
      this.stop(project.label);
    }

    this.projectMap[label].start = Date.now();
    this.projectMap[label].timer = window.setInterval(() => {
      this.projectMap[label].end = Date.now();
      const ms: number = this.projectMap[label].end - this.projectMap[label].start;
      this.projectMap[label].display = this.projectMap[label].time + ms;
    }, 100);
    this.projectMap[label].started = true;
  }

  stopClick(label: string): void {
    this.isLoading = true;
    this.stop(label);
    const newTrack: Track = {
      id: null,
      user: this.firebaseService.user,
      project: label,
      start: this.projectMap[label].start,
      end: this.projectMap[label].end,
    };
    this.firebaseService.addTrack(newTrack).subscribe(() => {
      this.load();
    });
  }

  private stop(label: string): void {
    window.clearInterval(this.projectMap[label].timer);
    this.projectMap[label].started = false;
  }

  add(addInput: HTMLInputElement): void {
    if (!addInput.value) {
      return;
    }
    this.projectMap[addInput.value] = this.create();
    this.projectMap[addInput.value].label = addInput.value;
    addInput.value = '';
  }

  create(): Project {
    return {
      id: '',
      label: '',
      time: 0,
      start: 0,
      end: 0,
      started: false,
      timer: null,
      display: 0,
    };
  }

  reset(): void {
    if (confirm('Reset?')) {
      this.isLoading = true;
      const observables: Observable<void>[] = [];
      for (const track of this.tracks) {
        observables.push(this.firebaseService.removeTrack(track.id));
      }
      zip(...observables).subscribe(() => {
        this.load();
      });
    }
  }

  remove(id: string): void {
    if (confirm('Remove?')) {
      this.isLoading = true;
      this.firebaseService.removeTrack(id).subscribe(() => {
        this.load();
      });
    }
  }
}
