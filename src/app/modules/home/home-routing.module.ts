import { NgModule } from '@angular/core';
import { Routes, RouterModule, UrlSegment } from '@angular/router';
import { AuthGuard } from '../../shared/guards';
import { HomeComponent } from './home/home.component';

export function homeMatcher(url: UrlSegment[]) {
  if (url.length === 0 || (url.length === 1 && url[0].path === 'lounge')) {
    return {consumed: url};
  } else {
    return null;
  }
}

const routes: Routes = [
  {
    matcher: homeMatcher,
    canActivate: [AuthGuard],
    component: HomeComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
