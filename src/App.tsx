import React from "react";
import * as S from "fp-ts/es6/Store";
import * as P from "fp-ts/es6/pipeable";
import * as L from "fp-ts/es6/Array";
import * as U from "unionize";

const { extract } = S.store;

const boardSize = 100;
const generationTime = 100;

type Board = boolean[][];

const gen = (size = boardSize) => {
  const length = size - 1;
  const columns = L.range(0, length);
  const rows = L.range(0, length);

  return columns.map(() => rows.map(() => Math.random() > 0.5));
};

export const toMatrix = <T,>(fn: (x: number, y: number) => T) => (
  board: Board
) => board.map((row, y) => row.map((_column, x) => fn(x, y)));

// data Pair a b = Pair (a, b)
const Pair = <A, B>() => U.unionize({ Pair: U.ofType<{ _1: A; _2: B }>() });

// data Store p s = Store (p -> s) p
const Store = <P, S>() =>
  U.unionize({ Store: U.ofType<{ peek: (p: P) => S; pos: P }>() }); // fp-ts's typeclass complaint

// type NumPair = Pair Float Float
type NumPair = U.UnionOf<typeof NumPair>;
const NumPair = Pair<number, number>();

const numPair = (a: number, b: number) => NumPair.Pair({ _1: a, _2: b });

// type GameStore = Store NumPair Boolean
type GameStore = S.Store<NumPair, boolean>;
const GameStore = Store<NumPair, boolean>();

const isAlive = (store: GameStore): boolean => {
  const { _1: x, _2: y } = store.pos;

  const n = [
    numPair(x - 1, y - 1),
    numPair(x, y - 1),
    numPair(x + 1, y - 1),
    numPair(x - 1, y),
    numPair(x + 1, y),
    numPair(x - 1, y + 1),
    numPair(x, y + 1),
    numPair(x + 1, y + 1)
  ]
    .map(offset =>
      P.pipe(
        store,
        S.peeks(() => offset)
      )
    )
    .filter(Boolean).length;

  const c = extract(store);

  return c && (n < 2 || n > 3) ? false : (c && n == 2) || n == 3 || c;
};

const game = (board: Board): Board => {
  const store = GameStore.Store({
    peek: ({ _1: x, _2: y }) =>
      y in board && x in board[y] ? board[y][x] : false,
    pos: NumPair.Pair({ _1: 0, _2: 0 })
  });

  const next = P.pipe(store, S.extend(isAlive));
  const peekOnCoords = (x: number, y: number) => next.peek(numPair(x, y));

  return toMatrix(peekOnCoords)(board);
};

const initial = gen();

function useInterval(callback: () => void, delay: number) {
  const savedCallback = React.useRef<() => void>();

  React.useEffect(() => {
    savedCallback.current = callback;
  });

  React.useEffect(() => {
    const tick = () => savedCallback.current?.();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}

const App: React.FC = () => {
  const [board, setBoard] = React.useState(initial);

  useInterval(() => void setBoard(game(board)), generationTime);

  return (
    <div className="board">
      {board.map(row =>
        row.map(column =>
          column ? (
            <span className="cell cell--alive" />
          ) : (
            <span className="cell cell--dead" />
          )
        )
      )}
    </div>
  );
};

export default App;
