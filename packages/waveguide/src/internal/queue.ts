// Copyright 2019 Ryan Zeigler
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export class Dequeue<A> {
  public static ofAll<A>(as: ReadonlyArray<A>): Dequeue<A> {
    return new Dequeue(as);
  }

  public static of<A>(a: A): Dequeue<A> {
    return new Dequeue([a]);
  }

  public static empty<A>(): Dequeue<A> {
    return new Dequeue([]);
  }

  public length: number;
  public empty: boolean;

  // TODO: Some day, implement an actual queue
  private constructor(public readonly array: ReadonlyArray<A>) {
    this.length = array.length;
    this.empty = this.length === 0;
  }

  public enqueue(a: A): Dequeue<A> {
    return new Dequeue([...this.array, a]);
  }

  public enqueueFront(a: A): Dequeue<A> {
    return new Dequeue([a, ...this.array]);
  }

  public dequeue(): [A | undefined, Dequeue<A>] {
    if (this.empty) {
      return [undefined, this];
    }
    return [this.array[0], new Dequeue(this.array.slice(1))];
  }
}