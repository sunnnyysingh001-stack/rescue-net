package dev.sunny.rescue;

import jakarta.persistence.*;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

// One locked aggregate keeps dispatch and stock changes atomic in this small demo.
@Entity
@Table(name = "operation_state")
class OperationState {

  @Id
  Long id = 1L;

  @Version
  Long version;

  @Lob
  @Column(nullable = false)
  String payload;

  protected OperationState() {}

  OperationState(String payload) {
    this.payload = payload;
  }
}

interface StateRepository extends JpaRepository<OperationState, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query(
    "select s from OperationState s where s.id = :id"
  )
  Optional<OperationState> lock(@Param("id") Long id);
}
