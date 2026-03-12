import { TestBed } from '@angular/core/testing';

import { ShowcaseSelectionService } from './showcase-selection.service';

describe('ShowcaseSelection', () => {
  let service: ShowcaseSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShowcaseSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
